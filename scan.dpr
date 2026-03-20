program scan;

{$APPTYPE CONSOLE}

uses
  SysUtils;

const
  IP = '192.168.10.91';
  PORT = 2001;
  TOTAL_BICOS = 16;

{ Funcoes da DLL - capitulo 2 (nativas Delphi) }
function InicializaSocket2(ip: PChar; porta: Integer): Boolean; stdcall;
  external 'companytec.dll';
function FechaSocket: Boolean; stdcall;
  external 'companytec.dll';
function GetEncerranteVolume(bicoInt: Byte): ShortString; stdcall;
  external 'companytec.dll';

var
  bico: Integer;
  resultado: ShortString;
  bicosFalha: string;

begin
  WriteLn('Script iniciado...');
  WriteLn('Diretorio: ', ExtractFilePath(ParamStr(0)));

  if not InicializaSocket2(PChar(IP), PORT) then
  begin
    WriteLn('Falha ao conectar no concentrador');
    WriteLn;
    Write('Pressione ENTER para sair...');
    ReadLn;
    Halt(1);
  end;

  WriteLn(Format('Conectou em %s:%d', [IP, PORT]));
  WriteLn;
  WriteLn('=== LEITURA DE ENCERRANTES (GetEncerranteVolume) ===');
  WriteLn('Bico | Encerrante (volume)');
  WriteLn('-----|--------------------');

  bicosFalha := '';

  for bico := 1 to TOTAL_BICOS do
  begin
    resultado := GetEncerranteVolume(Byte(bico));

    if (resultado = '') or (UpperCase(resultado) = 'FALHA') then
    begin
      WriteLn(Format('  %.2d  | FALHA', [bico]));
      if bicosFalha <> '' then
        bicosFalha := bicosFalha + ', ';
      bicosFalha := bicosFalha + Format('%.2d', [bico]);
    end
    else
      WriteLn(Format('  %.2d  | %s', [bico, resultado]));
  end;

  WriteLn;
  if bicosFalha <> '' then
    WriteLn('Bicos com falha: ', bicosFalha)
  else
    WriteLn('Bicos com falha: Nenhum');

  FechaSocket;
  WriteLn;
  WriteLn('Conexao encerrada.');
  WriteLn;
  Write('Pressione ENTER para sair...');
  ReadLn;
end.
