program leprecos;
{$mode delphi}

uses SysUtils;

type
  PPLNivelCur = record
    nivel0: Currency;
    nivel1: Currency;
    nivel2: Currency;
  end;

  PPLNivelDbl = record
    nivel0: Double;
    nivel1: Double;
    nivel2: Double;
  end;

  // Funcoes Delphi - convencao REGISTER (padrao Delphi)
  // InicializaSocket2(ip: PChar; porta: integer): boolean
  // Delphi register: ip->EAX, porta->EDX, result->AL
  TInicializaSocket2 = function(ip: PChar; porta: Integer): Boolean; register;
  TFechaSocket = function: Boolean; register;
  // LePPLNivel retorna record grande -> hidden var param
  // register: result_ptr->EAX, bico->EDX, niveis->ECX
  TLePPLNivelCur = procedure(var result: PPLNivelCur; const bico: string; niveis: Integer); register;
  TLePPLNivelDbl = procedure(var result: PPLNivelDbl; const bico: string; niveis: Integer); register;

  // Alternativa: stdcall
  TInicializaSocket2_std = function(ip: PChar; porta: Integer): Boolean; stdcall;
  TFechaSocket_std = function: Boolean; stdcall;
  TLePPLNivelCur_std = function(const bico: string; niveis: Integer): PPLNivelCur; stdcall;
  TLePPLNivelDbl_std = function(const bico: string; niveis: Integer): PPLNivelDbl; stdcall;

var
  DLLHandle: THandle;
  ip: AnsiString;
  port: Integer;
  bico: string;
  niveis: Integer;
  modo: string;
  result_cur: PPLNivelCur;
  result_dbl: PPLNivelDbl;
  dllPath: AnsiString;
  conv: string;

begin
  // Parametros: leprecos.exe <ip> <port> <bico> <niveis> [modo]
  // modo: "currency" (padrao), "double", "ambos"
  if ParamCount < 4 then
  begin
    WriteLn('{"erro":"Uso: leprecos.exe <ip> <port> <bico> <niveis> [currency|double|ambos]"}');
    Halt(1);
  end;

  ip := ParamStr(1);
  port := StrToIntDef(ParamStr(2), 0);
  bico := ParamStr(3);
  niveis := StrToIntDef(ParamStr(4), 3);
  if ParamCount >= 5 then
    modo := ParamStr(5)
  else
    modo := 'ambos';
  if ParamCount >= 6 then
    conv := ParamStr(6)
  else
    conv := 'register';

  dllPath := ExtractFilePath(ParamStr(0)) + 'companytec.dll';
  DLLHandle := LoadLibrary(PChar(dllPath));
  if DLLHandle = 0 then
  begin
    WriteLn('{"erro":"Falha ao carregar companytec.dll"}');
    Halt(1);
  end;

  // === REGISTER (padrao Delphi) ===
  if conv = 'register' then
  begin
    var InicSocket2_reg: TInicializaSocket2;
    var FechaSocket_reg: TFechaSocket;
    var LePPL_cur: TLePPLNivelCur;
    var LePPL_dbl: TLePPLNivelDbl;

    InicSocket2_reg := GetProcAddress(DLLHandle, 'InicializaSocket2');
    FechaSocket_reg := GetProcAddress(DLLHandle, 'FechaSocket');

    if (not Assigned(InicSocket2_reg)) or (not Assigned(FechaSocket_reg)) then
    begin
      WriteLn('{"erro":"InicializaSocket2/FechaSocket nao encontradas"}');
      FreeLibrary(DLLHandle);
      Halt(1);
    end;

    WriteLn('{"info":"Conectando via register..."}');
    try
      if not InicSocket2_reg(PChar(ip), port) then
      begin
        WriteLn('{"erro":"Falha ao conectar (register)"}');
        FreeLibrary(DLLHandle);
        Halt(1);
      end;
    except
      on E: Exception do
      begin
        WriteLn('{"erro":"Excecao ao conectar (register): ' + E.Message + '"}');
        FreeLibrary(DLLHandle);
        Halt(1);
      end;
    end;

    WriteLn('{"info":"Conectado com sucesso (register)"}');

    if (modo = 'currency') or (modo = 'ambos') then
    begin
      LePPL_cur := GetProcAddress(DLLHandle, 'LePPLNivel');
      if Assigned(LePPL_cur) then
      begin
        try
          FillChar(result_cur, SizeOf(result_cur), 0);
          LePPL_cur(result_cur, bico, niveis);
          WriteLn('{"tipo":"currency","conv":"register","nivel0":' + FloatToStr(result_cur.nivel0) +
                  ',"nivel1":' + FloatToStr(result_cur.nivel1) +
                  ',"nivel2":' + FloatToStr(result_cur.nivel2) + '}');
        except
          on E: Exception do
            WriteLn('{"tipo":"currency","conv":"register","erro":"' + E.Message + '"}');
        end;
      end;
    end;

    if (modo = 'double') or (modo = 'ambos') then
    begin
      LePPL_dbl := GetProcAddress(DLLHandle, 'LePPLNivel');
      if Assigned(LePPL_dbl) then
      begin
        try
          FillChar(result_dbl, SizeOf(result_dbl), 0);
          LePPL_dbl(result_dbl, bico, niveis);
          WriteLn('{"tipo":"double","conv":"register","nivel0":' + FloatToStr(result_dbl.nivel0) +
                  ',"nivel1":' + FloatToStr(result_dbl.nivel1) +
                  ',"nivel2":' + FloatToStr(result_dbl.nivel2) + '}');
        except
          on E: Exception do
            WriteLn('{"tipo":"double","conv":"register","erro":"' + E.Message + '"}');
        end;
      end;
    end;

    try FechaSocket_reg(); except end;
  end

  // === STDCALL ===
  else
  begin
    var InicSocket2_std: TInicializaSocket2_std;
    var FechaSocket_std: TFechaSocket_std;
    var LePPL_cur_std: TLePPLNivelCur_std;
    var LePPL_dbl_std: TLePPLNivelDbl_std;

    InicSocket2_std := GetProcAddress(DLLHandle, 'InicializaSocket2');
    FechaSocket_std := GetProcAddress(DLLHandle, 'FechaSocket');

    if (not Assigned(InicSocket2_std)) or (not Assigned(FechaSocket_std)) then
    begin
      WriteLn('{"erro":"InicializaSocket2/FechaSocket nao encontradas"}');
      FreeLibrary(DLLHandle);
      Halt(1);
    end;

    WriteLn('{"info":"Conectando via stdcall..."}');
    try
      if not InicSocket2_std(PChar(ip), port) then
      begin
        WriteLn('{"erro":"Falha ao conectar (stdcall)"}');
        FreeLibrary(DLLHandle);
        Halt(1);
      end;
    except
      on E: Exception do
      begin
        WriteLn('{"erro":"Excecao ao conectar (stdcall): ' + E.Message + '"}');
        FreeLibrary(DLLHandle);
        Halt(1);
      end;
    end;

    WriteLn('{"info":"Conectado com sucesso (stdcall)"}');

    if (modo = 'currency') or (modo = 'ambos') then
    begin
      LePPL_cur_std := GetProcAddress(DLLHandle, 'LePPLNivel');
      if Assigned(LePPL_cur_std) then
      begin
        try
          result_cur := LePPL_cur_std(bico, niveis);
          WriteLn('{"tipo":"currency","conv":"stdcall","nivel0":' + FloatToStr(result_cur.nivel0) +
                  ',"nivel1":' + FloatToStr(result_cur.nivel1) +
                  ',"nivel2":' + FloatToStr(result_cur.nivel2) + '}');
        except
          on E: Exception do
            WriteLn('{"tipo":"currency","conv":"stdcall","erro":"' + E.Message + '"}');
        end;
      end;
    end;

    if (modo = 'double') or (modo = 'ambos') then
    begin
      LePPL_dbl_std := GetProcAddress(DLLHandle, 'LePPLNivel');
      if Assigned(LePPL_dbl_std) then
      begin
        try
          result_dbl := LePPL_dbl_std(bico, niveis);
          WriteLn('{"tipo":"double","conv":"stdcall","nivel0":' + FloatToStr(result_dbl.nivel0) +
                  ',"nivel1":' + FloatToStr(result_dbl.nivel1) +
                  ',"nivel2":' + FloatToStr(result_dbl.nivel2) + '}');
        except
          on E: Exception do
            WriteLn('{"tipo":"double","conv":"stdcall","erro":"' + E.Message + '"}');
        end;
      end;
    end;

    try FechaSocket_std(); except end;
  end;

  FreeLibrary(DLLHandle);
end.
