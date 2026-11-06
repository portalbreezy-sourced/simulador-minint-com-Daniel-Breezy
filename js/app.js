let perguntas = [];
let indice = 0;
let pontos = 0;
let acertos = 0;
let erros = 0;
let segundos = 0;
let respostaEscolhida = false;
let relogio;
let intervaloPergunta;
let intervaloTicTac;
let tempoRestante = 30;
let contextoAudio;
let candidatoAtual = "";
let ajudasRestantes = 3;
let ajudaEmUso = false;

const disciplina = document.getElementById("disciplina");
const nivel = document.getElementById("nivel");
let totalPerguntasSimulado = 0;
const iniciar = document.getElementById("iniciar");
const area = document.getElementById("area-simulado");
const pergunta = document.getElementById("pergunta");
const alternativas = document.getElementById("alternativas");
const proximo = document.getElementById("proximo");
const resultado = document.getElementById("resultado");
const nomeCandidato = document.getElementById("nome-candidato");
const listaHistorico = document.getElementById("lista-historico");

function obterHistorico() {
    try {
        return JSON.parse(localStorage.getItem("historicoMININT") || "[]");
    } catch {
        return [];
    }
}

function mostrarHistorico() {
    const historico = obterHistorico();
    const nome = nomeCandidato.value.trim().toLowerCase();

    listaHistorico.innerHTML = "";

    if (!nome) {
        listaHistorico.textContent =
            "Introduz o teu nome para consultar o teu histórico.";
        return;
    }

    const provas = historico.filter(item =>
        item.nome.toLowerCase() === nome
    );

    if (provas.length === 0) {
        listaHistorico.textContent =
            "Ainda não existem provas guardadas com este nome.";
        return;
    }

    provas.forEach(item => {
        const caixa = document.createElement("div");
        caixa.className = "item-historico";

        const titulo = document.createElement("h3");
        titulo.textContent =
            `${item.disciplina} — ${item.nivel || "Nível não registado"}`;

        const detalhes = document.createElement("p");
        detalhes.textContent =
            `Candidato: ${item.nome} | Nota: ${item.nota} valores`;

        const resumo = document.createElement("p");
        resumo.textContent =
            `Acertos: ${item.acertos} | Erros: ${item.erros}`;

        const data = document.createElement("small");
        data.textContent = item.data;

        caixa.append(titulo, detalhes, resumo, data);
        listaHistorico.appendChild(caixa);
    });
}

nomeCandidato.addEventListener("input", mostrarHistorico);

iniciar.addEventListener("click", async () => {
    candidatoAtual = nomeCandidato.value.trim();
    checkpointsAnunciados.clear();

    if (!candidatoAtual) {
        alert("Introduz o teu nome primeiro!");
        nomeCandidato.focus();
        return;
    }

    if (!disciplina.value) {
        alert("Escolhe uma disciplina primeiro!");
        return;
    }

    if (!nivel.value) {
        alert("Escolhe o nível de dificuldade!");
        nivel.focus();
        return;
    }

    try {
        prepararAudio();

        const resposta = await fetch("dados/perguntas_niveis.json");

        if (!resposta.ok) {
            throw new Error("Erro ao carregar perguntas por nível.");
        }

        const dados = await resposta.json();
        const banco = dados[nivel.value]?.[disciplina.value];

        if (!Array.isArray(banco) || banco.length === 0) {
            throw new Error("Ainda não existem perguntas para esta combinação.");
        }

        perguntas = [...banco].sort(() => Math.random() - 0.5);
        totalPerguntasSimulado = perguntas.length;

        indice = 0;
        pontos = 0;
        acertos = 0;
        erros = 0;

        document.getElementById("barra-acertos").style.width = "0%";
        document.getElementById("texto-progresso").textContent =
            `0 / ${totalPerguntasSimulado}`;

        const tituloProgresso = document.querySelector(".progresso-cabecalho strong");
        tituloProgresso.textContent =
            `🏆 RUMO AOS ${totalPerguntasSimulado} ACERTOS`;

    segundos = 0;
        ajudasRestantes = 3;
        ajudaEmUso = false;
        atualizarAjudas();

        document.getElementById("historico").hidden = true;
        document.getElementById("inicio").hidden = true;
        document.querySelector(".hero").hidden = true;
        resultado.hidden = true;
        area.hidden = false;

        clearInterval(relogio);

        document.getElementById("cronometro").textContent =
            "Tempo: 00:00 | Restam: 30s";

        relogio = setInterval(() => {
            segundos++;

            const min = String(Math.floor(segundos / 60)).padStart(2, "0");
            const seg = String(segundos % 60).padStart(2, "0");

            document.getElementById("cronometro").textContent =
                `Tempo: ${min}:${seg} | Restam: ${tempoRestante}s`;
        }, 1000);

        mostrarPergunta();

    } catch (erro) {
        alert("Não foi possível iniciar o simulado: " + erro.message);
        console.error(erro);
    }
});

function falarResultado(texto) {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    const voz = new SpeechSynthesisUtterance(texto);
    voz.lang = "pt-PT";
    voz.rate = 0.95;

    window.speechSynthesis.speak(voz);
}


function prepararAudio() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    if (!contextoAudio) contextoAudio = new AudioCtx();

    if (contextoAudio.state === "suspended") {
        contextoAudio.resume();
    }
}

function pararContagemPergunta() {
    clearInterval(intervaloPergunta);
    clearInterval(intervaloTicTac);
}

function tocarTicTac() {
    if (!contextoAudio) return;

    if (contextoAudio.state === "suspended") {
        contextoAudio.resume();
    }

    const agora = contextoAudio.currentTime;
    const som = contextoAudio.createOscillator();
    const volume = contextoAudio.createGain();

    som.type = "square";
    som.frequency.setValueAtTime(1200, agora);
    som.frequency.exponentialRampToValueAtTime(650, agora + 0.09);

    volume.gain.setValueAtTime(0.12, agora);
    volume.gain.exponentialRampToValueAtTime(0.001, agora + 0.10);

    som.connect(volume);
    volume.connect(contextoAudio.destination);

    som.start(agora);
    som.stop(agora + 0.10);
}

function iniciarContagemPergunta(atual, reiniciar = true) {
    pararContagemPergunta();
    if (reiniciar) tempoRestante = 30;

    document.getElementById("cronometro").textContent =
        `Tempo: ${String(Math.floor(segundos / 60)).padStart(2, "0")}:${String(segundos % 60).padStart(2, "0")} | Restam: ${tempoRestante}s`;

    tocarTicTac();
    intervaloTicTac = setInterval(tocarTicTac, 900);

    intervaloPergunta = setInterval(() => {
        if (respostaEscolhida) {
            pararContagemPergunta();
            return;
        }

        tempoRestante--;

        const min = String(Math.floor(segundos / 60)).padStart(2, "0");
        const seg = String(segundos % 60).padStart(2, "0");

        document.getElementById("cronometro").textContent =
            `Tempo: ${min}:${seg} | Restam: ${tempoRestante}s`;

        if (tempoRestante <= 0) {
            respostaEscolhida = true;
            erros++;

            pararContagemPergunta();


            const correta = alternativas.querySelector(
                `[data-original-index="${atual.correta}"]`
            );

            if (correta) correta.style.background = "#b9edc8";

            const explicacao = document.createElement("p");
            explicacao.textContent =
                "TEMPO ESGOTADO! " + atual.explicacao;
            explicacao.style.padding = "10px";
            explicacao.style.background = "#eef4fa";
            explicacao.style.borderRadius = "7px";
            alternativas.appendChild(explicacao);

            document.querySelectorAll('input[name="resposta"]')
                .forEach(campo => campo.disabled = true);

            proximo.disabled = true;

            anunciarEliminacao();

            setTimeout(() => terminarSimulado(true), 9000);
        }
    }, 1000);
}


function anunciarEliminacao() {
    const mensagem = "RESPOSTA ERRADA! Foste eliminado do Concurso Público! E agora? 😂 Tanto estudo para acabares assim? Podes chorar à vontade! 😭";

    const aviso = document.createElement("div");
    aviso.textContent =
        "🚨 RESPOSTA ERRADA!\n\n" +
        "Foste eliminado do Concurso Público do MININT!\n\n" +
        "E agora? 😂 Tanto estudo para acabares assim?\n\n" +
        "Podes chorar à vontade! (Riso)\n\n" +
        "Tenta novamente e erra miseravelmente! 🤧";

    aviso.style.cssText =
        "white-space:pre-line;padding:16px;margin:12px 0;" +
        "background:#ffe0e0;color:#9b0000;border:2px solid #d00000;" +
        "border-radius:12px;font-weight:bold;text-align:center;";

    alternativas.appendChild(aviso);

    document.getElementById("progresso").textContent =
        "ELIMINADO DO CONCURSO!";

    if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();

        const voz = new SpeechSynthesisUtterance(mensagem);
        voz.lang = "pt-PT";
        voz.rate = 0.92;
        voz.pitch = 1.05;

        window.speechSynthesis.speak(voz);
    }
}

function atualizarAjudas() {
    const contador = document.getElementById("ajudas-restantes");
    if (contador) contador.textContent = ajudasRestantes;

    ["ajuda-daniel", "ajuda-professor", "ajuda-pular"].forEach(id => {
        const botao = document.getElementById(id);
        if (botao) botao.disabled = ajudasRestantes <= 0 || ajudaEmUso;
    });
}

function consumirAjuda() {
    if (ajudasRestantes <= 0 || ajudaEmUso || respostaEscolhida) {
        return false;
    }

    ajudasRestantes--;
    ajudaEmUso = true;
    pararContagemPergunta();
    atualizarAjudas();
    return true;
}

function mostrarMensagemAjuda(icone, titulo, texto) {
    const caixa = document.getElementById("mensagem-ajuda");
    caixa.hidden = false;
    caixa.innerHTML = "";

    const avatar = document.createElement("span");
    avatar.className = "avatar-ajuda";
    avatar.textContent = icone;

    const cabecalho = document.createElement("h3");
    cabecalho.textContent = titulo;

    const mensagem = document.createElement("p");
    mensagem.textContent = texto;

    caixa.append(avatar, cabecalho, mensagem);
}

function avancarComAjuda() {
    if (area.hidden) return;

    ajudaEmUso = false;
    indice++;

    if (indice < perguntas.length) {
        mostrarPergunta();
    } else {
        terminarSimulado();
    }
}

document.getElementById("ajuda-daniel").addEventListener("click", () => {
    if (!consumirAjuda()) return;

    respostaEscolhida = true;
    const atual = perguntas[indice];

    document.querySelectorAll('input[name="resposta"]')
        .forEach(campo => campo.disabled = true);

    const correta = alternativas.querySelector(
        `[data-original-index="${atual.correta}"]`
    );

    if (correta) correta.style.background = "#b9edc8";

    mostrarMensagemAjuda(
        "👨‍💻",
        "Daniel Breezy chegou!",
        "A resposta correcta é: " +
        atual.alternativas[atual.correta] +
        ". Atenção: esta ajuda não atribui pontos."
    );

    proximo.disabled = true;

    setTimeout(() => {
        if (!area.hidden) avancarComAjuda();
    }, 4000);
});

document.getElementById("ajuda-professor").addEventListener("click", () => {
    if (!consumirAjuda()) return;

    const atual = perguntas[indice];
    const respostaCorreta = atual.alternativas[atual.correta];

    let pista = atual.explicacao || "Analisa cuidadosamente as alternativas.";

    const escapada = respostaCorreta.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    pista = pista.replace(
        new RegExp(escapada, "gi"),
        "a informação correcta"
    );

    if (pista.trim().length < 12) {
        pista = "Presta atenção às palavras-chave da pergunta e elimina as alternativas que não correspondem ao tema.";
    }

    mostrarMensagemAjuda(
        "👨‍🏫",
        "Chamada com o professor",
        "O professor dá esta pista: " + pista
    );

    setTimeout(() => {
        if (area.hidden || respostaEscolhida) return;

        ajudaEmUso = false;
        document.getElementById("mensagem-ajuda").hidden = true;
        atualizarAjudas();
        iniciarContagemPergunta(atual, false);
    }, 4500);
});

document.getElementById("ajuda-pular").addEventListener("click", () => {
    if (!consumirAjuda()) return;

    respostaEscolhida = true;

    document.querySelectorAll('input[name="resposta"]')
        .forEach(campo => campo.disabled = true);

    mostrarMensagemAjuda(
        "⏭️",
        "Pergunta saltada!",
        "Avançaste sem ganhar pontos nem receber uma penalização."
    );

    proximo.disabled = true;

    setTimeout(() => {
        if (!area.hidden) avancarComAjuda();
    }, 1000);
});


const checkpointsAnunciados = new Set();

function atualizarProgresso() {
    const total = Math.min(acertos, totalPerguntasSimulado);
    const percentagem = totalPerguntasSimulado
        ? (total / totalPerguntasSimulado) * 100
        : 0;

    document.getElementById("barra-acertos").style.width =
        percentagem + "%";

    document.getElementById("texto-progresso").textContent =
        `${total} / ${totalPerguntasSimulado}`;

    const marcos = [...new Set([
        Math.ceil(totalPerguntasSimulado * 0.25),
        Math.ceil(totalPerguntasSimulado * 0.50),
        Math.ceil(totalPerguntasSimulado * 0.75),
        totalPerguntasSimulado
    ])];

    document.querySelector(".checkpoints").innerHTML =
        marcos.map((marco, indice) =>
            `<span>${marco}${indice === marcos.length - 1 ? " 🏆" : ""}</span>`
        ).join("");

    if (marcos.includes(total) && !checkpointsAnunciados.has(total)) {
        checkpointsAnunciados.add(total);

        setTimeout(() => {
            if (total === totalPerguntasSimulado) {
                falarResultado(
                    `CONTINUE, CAMBA! Chegaste à meta final dos ${totalPerguntasSimulado} acertos!`
                );
            } else {
                falarResultado("CONTINUE, CAMBA!");
            }
        }, 1800);
    }
}

function mostrarPergunta() {
    respostaEscolhida = false;
    proximo.disabled = true;

    proximo.textContent = indice === perguntas.length - 1
        ? "VER RESULTADO"
        : "PRÓXIMA PERGUNTA";

    const atual = perguntas[indice];
    ajudaEmUso = false;
    document.getElementById("mensagem-ajuda").hidden = true;
    atualizarAjudas();

    document.getElementById("progresso").textContent =
        `Pergunta ${indice + 1} de ${perguntas.length}`;

    pergunta.textContent = atual.pergunta;
    alternativas.innerHTML = "";

    const ordem = atual.alternativas.map((texto, i) => i);

    for (let i = ordem.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ordem[i], ordem[j]] = [ordem[j], ordem[i]];
    }

    ordem.forEach((originalIndex) => {
        const label = document.createElement("label");
        label.className = "alternativa";
        label.dataset.originalIndex = originalIndex;

        const input = document.createElement("input");
        input.type = "radio";
        input.name = "resposta";
        input.value = originalIndex;

        input.addEventListener("change", () => {
            if (respostaEscolhida) return;

            respostaEscolhida = true;
            pararContagemPergunta();

            const certa = originalIndex === atual.correta;
            if (certa) falarResultado("Resposta certa!");

            if (certa) {
                pontos++;
                acertos++;
                atualizarProgresso();
                label.style.background = "#b9edc8";
            } else {
                erros++;
                label.style.background = "#ffd0d0";

                const correta = alternativas.querySelector(
                    `[data-original-index="${atual.correta}"]`
                );

                if (correta) correta.style.background = "#b9edc8";
            }

            const explicacao = document.createElement("p");
            explicacao.textContent =
                (certa ? "Resposta correta! " : "Resposta incorreta. ") +
                atual.explicacao;
            explicacao.style.padding = "10px";
            explicacao.style.background = "#eef4fa";
            explicacao.style.borderRadius = "7px";
            alternativas.appendChild(explicacao);

            document.querySelectorAll('input[name="resposta"]')
                .forEach(campo => campo.disabled = true);

            proximo.disabled = true;

            if (certa) {
                setTimeout(() => {
                    if (area.hidden) return;

                    indice++;

                    if (indice < perguntas.length) {
                        mostrarPergunta();
                    } else {
                        terminarSimulado();
                    }
                }, 2500);
            } else {
                anunciarEliminacao();

                setTimeout(() => terminarSimulado(true), 9000);
            }
        });

        label.appendChild(input);
        label.appendChild(
            document.createTextNode(" " + atual.alternativas[originalIndex])
        );

        alternativas.appendChild(label);
    });
    iniciarContagemPergunta(atual);
}

proximo.addEventListener("click", () => {
    indice++;

    if (indice < perguntas.length) {
        mostrarPergunta();
    } else {
        terminarSimulado();
    }
});

function terminarSimulado(eliminado = false) {
    clearInterval(relogio);
    pararContagemPergunta();

    area.hidden = true;
    resultado.hidden = false;
    document.getElementById("historico").hidden = false;

    const nota = (pontos / perguntas.length) * 20;
    const min = Math.floor(segundos / 60);
    const seg = segundos % 60;

    document.getElementById("nota").textContent =
        `${nota.toFixed(1)} valores`;

    const respondidas = Math.min(indice + 1, perguntas.length);

    document.getElementById("resumo").textContent =
        `Acertos: ${acertos} | Erros: ${erros} | Perguntas respondidas: ${respondidas} de ${perguntas.length}. ${eliminado ? `ELIMINADO na pergunta ${respondidas}.` : "Prova concluída."} Tempo: ${min} min e ${seg} segundos.`;

    const historico = obterHistorico();

    historico.unshift({
        nome: candidatoAtual,
        disciplina: disciplina.options[disciplina.selectedIndex].text,
        nivel: nivel.options[nivel.selectedIndex].text,
        nota: Number(nota.toFixed(1)),
        acertos: acertos,
        erros: erros,
        data: new Date().toLocaleString("pt-AO")
    });

    try {
        localStorage.setItem(
            "historicoMININT",
            JSON.stringify(historico.slice(0, 20))
        );

        mostrarHistorico();
    } catch (erro) {
        console.error("Não foi possível guardar o histórico:", erro);
        alert("A prova terminou, mas não foi possível guardar o histórico.");
    }
}

mostrarHistorico();
