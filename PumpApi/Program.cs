using System.Globalization;
using System.Runtime.InteropServices;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.Configure<CompanytecOptions>(builder.Configuration.GetSection("Companytec"));
builder.Services.AddSingleton<CompanytecDll>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.MapGet("/api/health", (IOptions<CompanytecOptions> options, IWebHostEnvironment environment) =>
{
    var resolvedPath = CompanytecDll.ResolvePath(environment.ContentRootPath, options.Value.DllPath);
    return Results.Ok(new
    {
        status = "ok",
        dllPath = resolvedPath,
        dllExists = File.Exists(resolvedPath),
        ip = options.Value.Ip,
        port = options.Value.Port,
    });
})
.WithName("GetHealth")
.WithOpenApi();

app.MapPost("/api/raw-command", (RawCommandRequest request, CompanytecDll dll, IOptions<CompanytecOptions> options) =>
{
    var ip = request.Ip ?? options.Value.Ip;
    var port = request.Port ?? options.Value.Port;

    if (string.IsNullOrWhiteSpace(ip) || port is null)
    {
        return Results.BadRequest("Informe ip e port na requisição ou no appsettings.");
    }

    try
    {
        using var session = dll.OpenSession(ip, port.Value);
        var response = session.SendReceiveText(request.Command);
        return Results.Ok(new RawCommandResponse(request.Command, response));
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
})
.WithName("SendRawCommand")
.WithOpenApi();

app.MapGet("/api/encerrantes/{bico}", (string bico, CompanytecDll dll, IOptions<CompanytecOptions> options, string? ip, int? port) =>
{
    var resolvedIp = ip ?? options.Value.Ip;
    var resolvedPort = port ?? options.Value.Port;

    if (string.IsNullOrWhiteSpace(resolvedIp) || resolvedPort is null)
    {
        return Results.BadRequest("Informe ip e port na query string ou no appsettings.");
    }

    try
    {
        using var session = dll.OpenSession(resolvedIp, resolvedPort.Value);
        var total = session.ReadTotalsVolume(bico);
        return Results.Ok(new TotalsResponse(BicoHelpers.NormalizeHex(bico), total));
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
})
.WithName("ReadTotals")
.WithOpenApi();

app.MapGet("/api/precos/{bico}", (string bico, CompanytecDll dll, IOptions<CompanytecOptions> options, string? ip, int? port, int levels = 3) =>
{
    var resolvedIp = ip ?? options.Value.Ip;
    var resolvedPort = port ?? options.Value.Port;

    if (string.IsNullOrWhiteSpace(resolvedIp) || resolvedPort is null)
    {
        return Results.BadRequest("Informe ip e port na query string ou no appsettings.");
    }

    try
    {
        using var session = dll.OpenSession(resolvedIp, resolvedPort.Value);
        var prices = session.ReadPrices(bico, levels);

        return prices is null
            ? Results.UnprocessableEntity(new { message = "Resposta nao reconhecida pelo parser.", bico = BicoHelpers.NormalizeHex(bico) })
            : Results.Ok(prices);
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
})
.WithName("ReadPrices")
.WithOpenApi();

app.MapPost("/api/precos", (BatchPricesRequest request, CompanytecDll dll, IOptions<CompanytecOptions> options) =>
{
    var ip = request.Ip ?? options.Value.Ip;
    var port = request.Port ?? options.Value.Port;

    if (string.IsNullOrWhiteSpace(ip) || port is null)
    {
        return Results.BadRequest("Informe ip e port na requisição ou no appsettings.");
    }

    if (request.Bicos is null || request.Bicos.Count == 0)
    {
        return Results.BadRequest("Informe ao menos um bico.");
    }

    try
    {
        using var session = dll.OpenSession(ip, port.Value);
        var result = request.Bicos
            .Select(bico => session.ReadPrices(bico, request.Levels))
            .Where(price => price is not null)
            .ToDictionary(price => price!.Bico, price => price!);

        return Results.Ok(result);
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
})
.WithName("ReadPricesBatch")
.WithOpenApi();

app.Run();

sealed class CompanytecDll : IDisposable
{
    private readonly nint _handle;
    private readonly OpenSocket2Delegate _openSocket2;
    private readonly CloseSocketDelegate _closeSocket;
    private readonly ReadTotalsVolumeDelegate _readTotalsVolume;
    private readonly SendReceiveTextDelegate _sendReceiveText;

    public CompanytecDll(IOptions<CompanytecOptions> options, IWebHostEnvironment environment)
    {
        var dllPath = ResolvePath(environment.ContentRootPath, options.Value.DllPath);

        if (!File.Exists(dllPath))
        {
            throw new FileNotFoundException($"DLL nao encontrada em {dllPath}.");
        }

        _handle = NativeLibrary.Load(dllPath);
        _openSocket2 = LoadDelegate<OpenSocket2Delegate>("C_OpenSocket2");
        _closeSocket = LoadDelegate<CloseSocketDelegate>("C_CloseSocket");
        _readTotalsVolume = LoadDelegate<ReadTotalsVolumeDelegate>("C_ReadTotalsVolume");
        _sendReceiveText = LoadDelegate<SendReceiveTextDelegate>("C_SendReceiveText");
    }

    public CompanytecSession OpenSession(string ip, int port)
    {
        var opened = _openSocket2(ip, port);
        if (opened != 1)
        {
            throw new InvalidOperationException($"Falha ao conectar em {ip}:{port}.");
        }

        return new CompanytecSession(this);
    }

    internal int CloseSocket()
    {
        return _closeSocket();
    }

    internal int ReadTotalsVolume(string bico)
    {
        return _readTotalsVolume(bico);
    }

    internal string SendReceiveText(string command)
    {
        var result = ShortString.Create();
        var input = ShortString.FromString(command);
        _sendReceiveText(ref result, ref input);

        return result.ToManagedString();
    }

    public static string ResolvePath(string contentRootPath, string? configuredPath)
    {
        var dllPath = string.IsNullOrWhiteSpace(configuredPath)
            ? Path.Combine(contentRootPath, "..", "companytec.dll")
            : configuredPath;

        return Path.GetFullPath(Path.IsPathRooted(dllPath)
            ? dllPath
            : Path.Combine(contentRootPath, dllPath));
    }

    private T LoadDelegate<T>(string exportName) where T : Delegate
    {
        var address = NativeLibrary.GetExport(_handle, exportName);
        return Marshal.GetDelegateForFunctionPointer<T>(address);
    }

    public void Dispose()
    {
        if (_handle != nint.Zero)
        {
            NativeLibrary.Free(_handle);
        }
    }

    [UnmanagedFunctionPointer(CallingConvention.StdCall, CharSet = CharSet.Ansi)]
    private delegate int OpenSocket2Delegate(string ip, int port);

    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    private delegate int CloseSocketDelegate();

    [UnmanagedFunctionPointer(CallingConvention.StdCall, CharSet = CharSet.Ansi)]
    private delegate int ReadTotalsVolumeDelegate(string bico);

    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    private delegate void SendReceiveTextDelegate(ref ShortString result, ref ShortString comando);
}

sealed class CompanytecSession : IDisposable
{
    private readonly CompanytecDll _dll;
    private bool _disposed;

    public CompanytecSession(CompanytecDll dll)
    {
        _dll = dll;
    }

    public int ReadTotalsVolume(string bico)
    {
        EnsureNotDisposed();
        return _dll.ReadTotalsVolume(BicoHelpers.NormalizeHex(bico));
    }

    public string SendReceiveText(string command)
    {
        EnsureNotDisposed();
        return _dll.SendReceiveText(command);
    }

    public PriceResponse? ReadPrices(string bico, int levels)
    {
        EnsureNotDisposed();

        var normalizedBico = BicoHelpers.NormalizeHex(bico);
        var attempts = new List<PriceAttempt>();
        var modes = levels >= 3 ? new[] { 'u', 'U' } : new[] { 'U' };

        foreach (var mode in modes)
        {
            var command = ProtocolHelpers.BuildCommand($"&T{normalizedBico}{mode}");
            var response = SendReceiveText(command);
            attempts.Add(new PriceAttempt(mode.ToString(), command, response));

            var parsed = ProtocolHelpers.ParsePriceResponse(response);
            if (parsed is not null)
            {
                return parsed with { Attempts = attempts };
            }
        }

        return null;
    }

    public void Dispose()
    {
        if (_disposed)
        {
            return;
        }

        _dll.CloseSocket();
        _disposed = true;
    }

    private void EnsureNotDisposed()
    {
        ObjectDisposedException.ThrowIf(_disposed, this);
    }
}

static class ProtocolHelpers
{
    public static string BuildCommand(string content)
    {
        return $"({content}{ComputeChecksum(content)})";
    }

    public static PriceResponse? ParsePriceResponse(string response)
    {
        if (!response.StartsWith('(') || !response.EndsWith(')'))
        {
            return null;
        }

        var inner = response[1..^1];
        if (!inner.StartsWith("TU", StringComparison.Ordinal))
        {
            return null;
        }

        var data = inner[..^2];
        if (data.Length < 8)
        {
            return null;
        }

        var bico = data.Substring(2, 2);
        var prices = data.Substring(4);

        return prices.Length switch
        {
            8 => new PriceResponse(
                bico,
                CreatePriceValue(prices.Substring(4, 4)),
                CreatePriceValue(prices.Substring(0, 4)),
                null,
                response,
                Array.Empty<PriceAttempt>()),
            12 => new PriceResponse(
                bico,
                CreatePriceValue(prices.Substring(4, 4)),
                CreatePriceValue(prices.Substring(0, 4)),
                CreatePriceValue(prices.Substring(8, 4)),
                response,
                Array.Empty<PriceAttempt>()),
            _ => null,
        };
    }

    private static PriceValue CreatePriceValue(string raw)
    {
        var value = decimal.Parse(raw, CultureInfo.InvariantCulture) / 1000m;
        return new PriceValue(raw, value);
    }

    private static string ComputeChecksum(string content)
    {
        var sum = 0;
        foreach (var character in content)
        {
            sum += character;
        }

        return (sum & 0xFF).ToString("X2", CultureInfo.InvariantCulture);
    }
}

static class BicoHelpers
{
    public static string NormalizeHex(string value)
    {
        return value.Trim().ToUpperInvariant().PadLeft(2, '0');
    }
}

[StructLayout(LayoutKind.Sequential, Pack = 1)]
struct ShortString
{
    public byte Len;

    [MarshalAs(UnmanagedType.ByValArray, SizeConst = 255)]
    public byte[] Chars;

    public static ShortString Create()
    {
        return new ShortString
        {
            Len = 0,
            Chars = new byte[255],
        };
    }

    public static ShortString FromString(string value)
    {
        var bytes = new byte[255];
        var encoded = System.Text.Encoding.ASCII.GetBytes(value);
        var length = Math.Min(encoded.Length, bytes.Length);
        Array.Copy(encoded, bytes, length);

        return new ShortString
        {
            Len = (byte)length,
            Chars = bytes,
        };
    }

    public readonly string ToManagedString()
    {
        return System.Text.Encoding.ASCII.GetString(Chars, 0, Len);
    }
}

sealed class CompanytecOptions
{
    public string? DllPath { get; init; }
    public string? Ip { get; init; }
    public int? Port { get; init; }
}

record RawCommandRequest(string Command, string? Ip, int? Port);
record RawCommandResponse(string Command, string Response);
record TotalsResponse(string Bico, int TotalVolume);
record BatchPricesRequest(List<string> Bicos, int Levels = 3, string? Ip = null, int? Port = null);
record PriceValue(string Raw, decimal Value);
record PriceAttempt(string Mode, string Command, string Response);
record PriceResponse(string Bico, PriceValue? Nivel0, PriceValue? Nivel1, PriceValue? Nivel2, string RawResponse, IReadOnlyList<PriceAttempt> Attempts);
