using ColmeiaApi.DTOs;
using ColmeiaApi.Models;
using Microsoft.EntityFrameworkCore;

namespace ColmeiaApi.Data;

public static class LeituraExtensions
{
    public const string TipoSensorPadrao = "Manual";

    public static bool TemDadosLeitura(this RegistroDto dto) =>
        dto.TemperaturaInterna.HasValue ||
        dto.TemperaturaExterna.HasValue ||
        dto.UmidadeInterna.HasValue ||
        dto.UmidadeExterna.HasValue ||
        dto.PressaoAtmosferica.HasValue ||
        dto.VelocidadeVento.HasValue ||
        dto.Peso.HasValue;

    /// <summary>
    /// Retorna o sensor da colmeia. Se a colmeia não tiver nenhum, cria o sensor
    /// padrão (tipo "Manual") no contexto; o chamador é quem chama SaveChanges.
    /// </summary>
    public static async Task<Sensor> ObterOuCriarSensorAsync(this ColmeiaContext db, Guid idColmeia)
    {
        var sensor = await db.Sensores.FirstOrDefaultAsync(s => s.IdColmeia == idColmeia);
        if (sensor is not null) return sensor;

        sensor = new Sensor { Id = Guid.NewGuid(), IdColmeia = idColmeia, Tipo = TipoSensorPadrao };
        db.Sensores.Add(sensor);
        return sensor;
    }

    private static void Preencher(Leitura leitura, RegistroDto dto)
    {
        leitura.TemperaturaInterna = dto.TemperaturaInterna;
        leitura.TemperaturaExterna = dto.TemperaturaExterna;
        leitura.UmidadeInterna = dto.UmidadeInterna;
        leitura.UmidadeExterna = dto.UmidadeExterna;
        leitura.PressaoAtmosferica = dto.PressaoAtmosferica;
        leitura.VelocidadeVento = dto.VelocidadeVento;
        leitura.Peso = dto.Peso;
    }

    /// <summary>
    /// Atualiza a leitura do registro ou a cria (com o sensor da colmeia) se ainda não existir.
    /// Sem leitura existente e sem dados no dto, nada é criado.
    /// </summary>
    public static async Task AplicarLeituraAsync(this ColmeiaContext db, Registro registro, Guid idColmeia, RegistroDto dto)
    {
        if (registro.Leitura is not null)
        {
            Preencher(registro.Leitura, dto);
            return;
        }

        if (!dto.TemDadosLeitura()) return;

        var sensor = await db.ObterOuCriarSensorAsync(idColmeia);
        var leitura = new Leitura { IdRegistro = registro.Id, IdSensor = sensor.Id };
        Preencher(leitura, dto);
        db.Leituras.Add(leitura);
        registro.Leitura = leitura;
    }
}
