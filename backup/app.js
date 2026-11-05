let perguntas = [];
let indice = 0;
let pontos = 0;
let acertos = 0;
let erros = 0;
let segundos = 0;
let respostaEscolhida = false;
let relogio;

const disciplina = document.getElementById("disciplina");
const iniciar = document.getElementById("iniciar");
const area = document.getElementById("area-simulado");
const pergunta = document.getElementById("pergunta");
const alternativas = document.getElementById("alternativas");
const proximo = document.getElementById("proximo");
const resultado = document.getElementById("resultado");

iniciar.addEventListener("click", async () => {
    if (!disciplina.value) {
        alert("Escolhe uma disciplina primeiro!");
        return;
    }

    try {
        const resposta = await fetch("dados/perguntas.json");

        if (!resposta.ok) {
            throw new Error("Erro ao carregar perguntas");
        }

        const dados = await resposta.json();
        const banco = dados[disciplina.value];

        if (!banco || banco.length < 20) {
            throw new Error("Não existem perguntas suficientes.");
        }

        perguntas = [...banco]
            .sort(() => Math.random() - 0.5)
            .slice(0, 20);

        indice = 0;
        pontos = 0;
        acertos = 0;
        erros = 0;
        segundos = 0;

        document.querySelector(".materias").hidden = true;
        resultado.hidden = true;
        area.hidden = false;

        clearInterval(relogio);
        document.getElementById("cronometro").textContent = "Tempo: 00:00";

        relogio = setInterval(() => {
            segundos++;

            const min = String(Math.floor(segundos / 60)).padStart(2, "0");
            const seg = String(segundos % 60).padStart(2, "0");

            document.getElementById("cronometro").textContent =
                `Tempo: ${min}:${seg}`;
        }, 1000);

        mostrarPergunta();

    } catch (erro) {
        alert("Não foi possível iniciar o simulado: " + erro.message);
        console.error(erro);
    }
});

function mostrarPergunta() {
    respostaEscolhida = false;
    proximo.disabled = true;
    proximo.textContent = indice === perguntas.length - 1
        ? "VER RESULTADO"
        : "PRÓXIMA PERGUNTA";

    const atual = perguntas[indice];

    document.getElementById("progresso").textContent =
        `Pergunta ${indice + 1} de ${perguntas.length}`;

    pergunta.textContent = atual.pergunta;
    alternativas.innerHTML = "";

    // Misturar aleatoriamente as alternativas
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

            const certa = originalIndex === atual.correta;

            if (certa) {
                pontos++;
                acertos++;
                label.style.background = "#b9edc8";
            } else {
                erros++;

                label.style.background = "#ffd0d0";

                const correta = alternativas.querySelector(
                    `[data-original-index="${atual.correta}"]`
                );

                correta.style.background = "#b9edc8";
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

            proximo.disabled = false;
        });

        label.appendChild(input);
        label.appendChild(
            document.createTextNode(" " + atual.alternativas[originalIndex])
        );

        alternativas.appendChild(label);
    });
}

proximo.addEventListener("click", () => {
    indice++;

    if (indice < perguntas.length) {
        mostrarPergunta();
    } else {
        terminarSimulado();
    }
});

function terminarSimulado() {
    clearInterval(relogio);

    area.hidden = true;
    resultado.hidden = false;

    const nota = (pontos / perguntas.length) * 20;
    const min = Math.floor(segundos / 60);
    const seg = segundos % 60;

    document.getElementById("nota").textContent =
        `${nota.toFixed(1)} valores`;

    document.getElementById("resumo").textContent =
        `Acertos: ${acertos} | Erros: ${erros} | Total: ${perguntas.length} perguntas. Tempo: ${min} min e ${seg} segundos.`;
}
