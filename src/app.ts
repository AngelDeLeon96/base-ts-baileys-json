import path, { join } from 'path'
import { createBot, createProvider, createFlow, addKeyword, utils, EVENTS } from '@builderbot/bot'
import { JsonFileDB as Database } from '@builderbot/database-json'
import { BaileysProvider as Provider } from '@builderbot/provider-baileys'
import { ollama2, ollamaAPI } from './utils/ollama'
import { startBot } from './utils/timer'
import { debounce } from './utils/debounce'
import Queue from 'queue-promise'
const queue = new Queue({
    concurrent: 1,
    interval: 500
});
import EnvLoader from './utils/config'

const env = EnvLoader.load()

const PORT = env.PORT || '3000'


const freeFlow = addKeyword(EVENTS.ACTION)
    .addAction(async (ctx, { gotoFlow, blacklist }) => startBot(ctx, gotoFlow, blacklist))
    .addAction(async (ctx, { blacklist }) => {
        const number = ctx.from.replace("+", "")
        const check_num = blacklist.checkIf(number)
        //console.log("Check number", check_num)

        if (!check_num) {
            blacklist.add(number)
            //console.log(`Number: ${number} is added to blacklist and Bot will not respond to this number`)
            return
        }

        //console.log(number, check)
    })

const welcomeFlow = addKeyword(EVENTS.WELCOME)
    .addAnswer('Hola 😊')
    .addAnswer(`Soy "TARS" un Agente IA 🤖`, { delay: 100 })
    .addAnswer("En que puedo ayudarte, el dia de hoy?", { delay: 100 })
    .addAction(async (_, { gotoFlow }) => {
        return gotoFlow(freeFlow)
    })

const main = async () => {
    const adapterFlow = createFlow([welcomeFlow, freeFlow])

    const adapterProvider = createProvider(Provider)

    const adapterDB = new Database({ filename: 'db.json' })

    const bot = await createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })


    bot.httpServer(+PORT)

    adapterProvider.on('message', (payload) => {
        try {
            //const debounceOllama = debounce(ollamaIA, 500);
            if (bot.dynamicBlacklist.checkIf(payload.from)) {
                queue.enqueue(async () => {
                    const response = await ollamaAPI(payload, adapterProvider)

                    if (response) {
                        const respuesta = response
                        sendResponse(payload.key.remoteJid, respuesta)
                    }
                });
                return

            }
        } catch (error) {
            console.log(error)
        }
    })

    bot.on('send_message', ({ answer, from }) => {
        //console.log(`Bot Send Message Payload:`, { answer, from })
    })

    function sendResponse(phone: string, response: string) {
        adapterProvider.vendor.sendMessage(phone, { text: response }, {});
    }
}

main()

