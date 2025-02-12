import ollama from 'ollama';
import { Ollama } from "@langchain/ollama";
import { PromptTemplate } from "@langchain/core/prompts";
import { ProviderClass } from '@builderbot/bot';
import { BotContext } from '@builderbot/bot/dist/types';
import EnvLoader from './config';
import * as http from 'http'

const env = EnvLoader.load()
// Variable para manejar mensajes de progreso
let progressInterval: NodeJS.Timeout;
let progressMessageIndex = 0;
const progressMessages = [
    "🔥Todavía estoy trabajando en ello...",
    "🔎Buscando información relevante...",
    "😴Esto puede tomar un poco más de tiempo, gracias por tu paciencia..."
];

const llm = new Ollama({
    model: env.MODEL, // Default value
    temperature: 0,
    maxRetries: 2,
    // other params...
});

interface ApiResponse {
    data: any;
    statusCode: number;
}

const ollama2 = async (payload: BotContext, adapter: ProviderClass) => {
    try {
        // Inicia un temporizador para enviar mensajes periódicos
        adapter.vendor.sendMessage(payload.key.remoteJid, { text: "🔴Estoy procesando tu solicitud, por favor espera." }, {});

        progressInterval = setInterval(() => {
            console.log(progressMessages[progressMessageIndex]);
            adapter.vendor.sendMessage(payload.key.remoteJid, { text: progressMessages[progressMessageIndex] }, {});

            progressMessageIndex = (progressMessageIndex + 1) % progressMessages.length;
        }, 100000); // Cada 10 segundos.

        const prompt = PromptTemplate.fromTemplate(
            "Analiza la pregunta del usuario {input} y responde en {output_language}:\n"
        )

        const chain = prompt.pipe(llm);
        const res = await chain.invoke({
            output_language: "Spanish",
            input: payload.body,
        })
        clearInterval(progressInterval);
        const res_cleared = responseClear(res)

        return res_cleared
    }
    catch (error) {
        clearInterval(progressInterval);
        console.error("Error al procesar la consulta:", error);
        // Envía un mensaje de error al usuario
        console.log("Lo siento, ocurrió un problema al procesar tu solicitud.");

    }
}

const ollamaAPI = async (data: BotContext, adapter: ProviderClass) => {
    if (!data) {
        throw new Error('Se requiere una pregunta válida.');
    }
    adapter.vendor.sendMessage(data.key.remoteJid, { text: "🔴Estoy procesando tu solicitud, por favor espera." }, {});
    console.log(data)

    const apiUrl = 'http://localhost:11434/api/chat';
    const res = JSON.stringify({
        model: env.MODEL,
        messages: [
            { role: 'user', content: data.body }
        ],
        stream: false,
        options: {
            "temperature": 0
        }
    });

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: res
    };

    const dataRaw = await fetch(apiUrl, options);
    const response = await dataRaw.json();
    console.log(">==", response)
    const res_cleared = responseClear(response?.message?.content)
    return res_cleared
}

const responseClear = (response: string) => {

    // Eliminar contenido entre <explicación> y </explicación>
    const respuestaLimpia: string = response.replace(/<think>[\s\S]*?<\/think>/g, '');
    console.log("cleared: ", respuestaLimpia)
    // Eliminar espacios en blanco adicionales
    const respuestaFinal: string = respuestaLimpia.trim();

    return respuestaFinal
}

export { ollama2, ollamaAPI };