import ollama from 'ollama';
import { Ollama } from "@langchain/ollama";
import { PromptTemplate } from "@langchain/core/prompts";
import { ProviderClass } from '@builderbot/bot';
import { BotContext } from '@builderbot/bot/dist/types';

// Variable para manejar mensajes de progreso
let progressInterval: NodeJS.Timeout;
let progressMessageIndex = 0;
const progressMessages = [
    "🔥Todavía estoy trabajando en ello...",
    "🔎Buscando información relevante...",
    "😴Esto puede tomar un poco más de tiempo, gracias por tu paciencia..."
];

const llm = new Ollama({
    model: "phi4", // Default value
    temperature: 0,
    maxRetries: 2,
    // other params...
});

const promptGenerator = (history: Array<{ role: string, content: string }>) => {
    const formattedHistory = history.map(item => `${item.role}: ${item.content}`).join('\n');

    return `
Como una inteligencia artificial avanzada, tu tarea es analizar el contexto de una conversación y determinar cuál de las siguientes acciones es más apropiada para realizar:
--------------------------------------------------------
Historial de conversación:
${formattedHistory}

Posibles acciones a realizar:
1. nombre del producto: Esta función se debe realizar cuando el cliente solicita el precio de un producto. **Si eliges esta acción, debes responder con SOLO el nombre específico del producto mencionado por el usuario (ejemplo: "leche", "manteca") sin ninguna palabra adicional.**
2. REPETIR: Esta acción se debe realizar cuando la inteligencia artificial no puede determinar otra opción a realizar y cae en esta por defecto, es el equivalente al caso fallback.
3. SUPERMERCADO: Esta función se debe realizar cuando el cliente solicita información sobre donde se obtienen los precios.
4. HOLA: Esta función se debe realizar cuando el cliente saluda. IMPORTANTE: no utilizar si el cliente dice algo como "hola quiero saber el precio de este producto X", en ese caso ir por PRODUCTO.
5. ADIOS: Esta función se debe realizar cuando el cliente se despide.
6. AYUDA: Esta función se debe realizar cuando el cliente solicita ayuda o alguna frase que incluya la palabra ayuda o su significado.
7. CREADOR: Esta función se debe realizar cuando el cliente solicite información sobre la persona que creó el bot.

Respuesta ideal: si el usuario menciona un producto, responde solo con el nombre del producto. Si no hay un producto claro, responde con una de estas opciones (REPETIR|SUPERMERCADO|HOLA|ADIOS|AYUDA|CREADOR).
Si el cliente da una respuesta que no es producto pero no sabes que es, responde con 'REPETIR'.
`;
};

const ollamaIA = async (prompt: string) => {
    try {
        console.log("enviando a ollama:", prompt);
        // Incluimos el prompt como un mensaje del sistema (opcional)
        const messages = [
            { role: "system", content: prompt }
        ];

        const response = await ollama.chat({
            model: 'phi4',
            // model: 'llama3.1',
            // model: 'codeqwen',
            // model: 'phi3', 

            messages: messages
        });

        // Retorna solo el contenido de la respuesta del asistente
        return response.message.content;

    } catch (error) {
        console.error('Error al obtener respuesta de la IA:', error);
        return "ERROR";
    }
};
const ollama2 = async (payload: BotContext, adapter: ProviderClass) => {
    try {
        // Inicia un temporizador para enviar mensajes periódicos
        progressInterval = setInterval(() => {
            console.log(progressMessages[progressMessageIndex]);
            adapter.sendMessage(payload.from, { text: progressMessages[progressMessageIndex] }, {});

            progressMessageIndex = (progressMessageIndex + 1) % progressMessages.length;
        }, 10000); // Cada 10 segundos.

        const prompt = PromptTemplate.fromTemplate(
            "Analiza la pregunta del usuario {input} y responde en {output_language}:\n"
        )

        const chain = prompt.pipe(llm);
        const res = await chain.invoke({
            output_language: "Spanish",
            input: payload.body,
        })
        clearInterval(progressInterval);

        return res
    }
    catch (error) {
        clearInterval(progressInterval);
        console.error("Error al procesar la consulta:", error);
        // Envía un mensaje de error al usuario
        console.log("Lo siento, ocurrió un problema al procesar tu solicitud.");

    }
}


export { ollama2 };