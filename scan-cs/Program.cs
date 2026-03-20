using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;

class Program
{
    [DllImport("companytec.dll", CallingConvention = CallingConvention.StdCall, CharSet = CharSet.Ansi)]
    static extern int C_OpenSocket2(string ip, int port);

    [DllImport("companytec.dll", CallingConvention = CallingConvention.StdCall)]
    static extern int C_CloseSocket();

    [DllImport("companytec.dll", CallingConvention = CallingConvention.StdCall, CharSet = CharSet.Ansi)]
    static extern int C_ReadTotalsVolume(string bico);

    const string IP = "192.168.10.91";
    const int PORT = 2001;
    const int TOTAL_BICOS = 16;

    static void Main()
    {
        Console.WriteLine("Script iniciado...");
        Console.WriteLine("Diretorio: " + AppDomain.CurrentDomain.BaseDirectory);

        int connected = C_OpenSocket2(IP, PORT);
        if (connected == 0)
        {
            Console.WriteLine("Falha ao conectar no concentrador");
            Console.WriteLine("\nPressione ENTER para sair...");
            Console.ReadLine();
            return;
        }

        Console.WriteLine(string.Format("Conectou em {0}:{1}\n", IP, PORT));
        Console.WriteLine("=== LEITURA DE ENCERRANTES (C_ReadTotalsVolume) ===");
        Console.WriteLine("Bico | Encerrante (volume)");
        Console.WriteLine("-----|--------------------");

        List<string> bicosFalha = new List<string>();

        for (int bico = 1; bico <= TOTAL_BICOS; bico++)
        {
            string bicoStr = bico.ToString("D2");
            int resultado = C_ReadTotalsVolume(bicoStr);

            if (resultado == -1)
            {
                Console.WriteLine(string.Format("  {0}  | FALHA (-1)", bicoStr));
                bicosFalha.Add(bicoStr);
            }
            else
            {
                Console.WriteLine(string.Format("  {0}  | {1}", bicoStr, resultado));
            }
        }

        Console.WriteLine();
        Console.WriteLine("Bicos com falha: " + (bicosFalha.Count > 0 ? string.Join(", ", bicosFalha) : "Nenhum"));

        C_CloseSocket();
        Console.WriteLine("\nConexao encerrada.");
        Console.WriteLine("\nPressione ENTER para sair...");
        Console.ReadLine();
    }
}
