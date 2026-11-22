using ColmeiaApi.Controllers;
using ColmeiaApi.Data;
using ColmeiaApi.DTOs;
using ColmeiaApi.Models;
using ColmeiaApi.Tests.Helpers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace ColmeiaApi.Tests.Controllers;

public class RegistrosControllerTests
{
    private static async Task<(ColmeiaContext db, Guid adminId, Colmeia colmeia)> SetupAsync()
    {
        var db = DbHelper.CreateInMemory();
        var adminId = Guid.NewGuid();
        db.Usuarios.Add(new Usuario
        {
            Id = adminId, Nome = "Admin", Sobrenome = "Test",
            Cpf = "00000000000", Email = "admin@test.com",
            SenhaHash = "hash", DataNascimento = new DateOnly(1990, 1, 1),
            Permissao = Permissao.Admin, Ativo = true, Aprovado = true,
        });
        var loc = new Localizacao { Id = Guid.NewGuid(), Cidade = "X" };
        var colmeia = new Colmeia { Id = Guid.NewGuid(), Nome = "C1", IdLocalizacao = loc.Id };
        db.Localizacoes.Add(loc);
        db.Colmeias.Add(colmeia);
        await db.SaveChangesAsync();
        return (db, adminId, colmeia);
    }

    private static RegistrosController Ctrl(ColmeiaContext db, Guid adminId) =>
        new(db) { ControllerContext = AuthHelper.CreateContext(adminId, "Admin") };

    private static RegistroDto Dto(decimal? tempInt = null, decimal? peso = null, decimal? vento = null) => new(
        "C1", DateTime.UtcNow, tempInt, 20m, 50m, 60m, 1013m, vento, peso,
        true, false, null, "Boa", "Sol", true, null);

    private static RegistroDto DtoSemLeitura() => new(
        "C1", DateTime.UtcNow, null, null, null, null, null, null, null,
        true, false, null, "Boa", "Sol", true, null);

    [Fact]
    public async Task Post_ComLeitura_ColmeiaSemSensor_CriaSensorEGravaLeitura()
    {
        var (db, adminId, colmeia) = await SetupAsync();
        var result = await Ctrl(db, adminId).Post(Dto(tempInt: 30m, peso: 40m, vento: 5m));

        var ok = Assert.IsType<OkObjectResult>(result);
        var sensor = await db.Sensores.SingleAsync(s => s.IdColmeia == colmeia.Id);
        Assert.Equal("Manual", sensor.Tipo);
        var leitura = await db.Leituras.SingleAsync();
        Assert.Equal(sensor.Id, leitura.IdSensor);
        Assert.Equal(30m, leitura.TemperaturaInterna);
        Assert.Equal(20m, leitura.TemperaturaExterna);
        Assert.Equal(50m, leitura.UmidadeInterna);
        Assert.Equal(60m, leitura.UmidadeExterna);
        Assert.Equal(1013m, leitura.PressaoAtmosferica);
        Assert.Equal(5m, leitura.VelocidadeVento);
        Assert.Equal(40m, leitura.Peso);
        Assert.NotNull(ok.Value);
    }

    [Fact]
    public async Task Post_ComAlgunsCampos_GravaSomenteEles()
    {
        var (db, adminId, _) = await SetupAsync();
        var dto = DtoSemLeitura() with { Peso = 12m };
        await Ctrl(db, adminId).Post(dto);

        var leitura = await db.Leituras.SingleAsync();
        Assert.Equal(12m, leitura.Peso);
        Assert.Null(leitura.TemperaturaInterna);
        Assert.Null(leitura.VelocidadeVento);
    }

    [Fact]
    public async Task Post_ReusaSensorExistente()
    {
        var (db, adminId, colmeia) = await SetupAsync();
        var sensorId = Guid.NewGuid();
        db.Sensores.Add(new Sensor { Id = sensorId, IdColmeia = colmeia.Id, Tipo = "DHT22" });
        await db.SaveChangesAsync();

        await Ctrl(db, adminId).Post(Dto(tempInt: 30m));

        Assert.Single(db.Sensores);
        Assert.Equal(sensorId, (await db.Leituras.SingleAsync()).IdSensor);
    }

    [Fact]
    public async Task Post_SemLeitura_NaoCriaLeituraNemSensor()
    {
        var (db, adminId, _) = await SetupAsync();
        var result = await Ctrl(db, adminId).Post(DtoSemLeitura());

        Assert.IsType<OkObjectResult>(result);
        Assert.Empty(db.Leituras);
        Assert.Empty(db.Sensores);
        Assert.Single(db.Registros);
    }

    [Fact]
    public async Task Put_Admin_CriaLeituraQuandoRegistroNaoTinha()
    {
        var (db, adminId, colmeia) = await SetupAsync();
        var ctrl = Ctrl(db, adminId);
        var criado = Assert.IsType<OkObjectResult>(await ctrl.Post(DtoSemLeitura()));
        var id = (Guid)criado.Value!.GetType().GetProperty("id")!.GetValue(criado.Value)!;
        Assert.Empty(db.Leituras);

        var result = await ctrl.Put(id, Dto(tempInt: 31m, peso: 8m));

        Assert.IsType<OkObjectResult>(result);
        var leitura = await db.Leituras.SingleAsync();
        Assert.Equal(id, leitura.IdRegistro);
        Assert.Equal(31m, leitura.TemperaturaInterna);
        Assert.Equal(8m, leitura.Peso);
        Assert.Equal(colmeia.Id, (await db.Sensores.SingleAsync()).IdColmeia);
    }

    [Fact]
    public async Task AprovarSolicitacao_CriaLeituraQuandoRegistroNaoTinha()
    {
        var (db, adminId, _) = await SetupAsync();
        var criado = Assert.IsType<OkObjectResult>(await Ctrl(db, adminId).Post(DtoSemLeitura()));
        var id = (Guid)criado.Value!.GetType().GetProperty("id")!.GetValue(criado.Value)!;

        var dados = System.Text.Json.JsonSerializer.Serialize(Dto(tempInt: 27m, peso: 9m));
        var sol = new SolicitacaoAlteracao
        {
            IdRegistro = id, IdUsuario = adminId,
            Tipo = TipoSolicitacao.Editar, DadosNovos = dados,
        };
        db.SolicitacoesAlteracao.Add(sol);
        await db.SaveChangesAsync();

        var admin = new AdminController(db) { ControllerContext = AuthHelper.CreateContext(adminId, "Admin") };
        var result = await admin.AprovarSolicitacao(sol.Id);

        Assert.IsType<OkObjectResult>(result);
        var leitura = await db.Leituras.SingleAsync();
        Assert.Equal(27m, leitura.TemperaturaInterna);
        Assert.Equal(9m, leitura.Peso);
    }
}
