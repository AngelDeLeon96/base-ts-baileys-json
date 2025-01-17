import { EVENTS, addKeyword } from '@builderbot/bot'
import { BotContext, DynamicBlacklist, TFlow } from '@builderbot/bot/dist/types';
import EnvLoader from './config';
// Object to store timers for each user
const env = EnvLoader.load()
const timers = {};

// Flow for handling inactivity
const idleFlow = addKeyword(EVENTS.ACTION)
    .addAction(async (_, { endFlow }) => {
        return endFlow("Response time has expired");
    }
    );

// Function to start the inactivity timer for a user
const startBot = (ctx: BotContext, gotoFlow: (a: TFlow) => Promise<void>, blacklist: DynamicBlacklist, ms = env.TIMER_BOT) => {

    if (timers[ctx.from]) {
        clearTimeout(timers[ctx.from]);
    }
    // Inicia un nuevo temporizador de inactividad
    timers[ctx.from] = setTimeout(() => {
        const number = ctx.from.replace("+", "")
        //console.log(`User timeout startbot flow: ${ctx.from}`);
        if (blacklist.checkIf(number)) {
            blacklist.remove(number)
        }
        return gotoFlow(idleFlow);
    }, ms);


}
// Function to start the inactivity timer for a user
const start = (ctx: BotContext, gotoFlow: (a: TFlow) => Promise<void>, ms: number) => {
    timers[ctx.from] = setTimeout(() => {
        console.log(`User timeout: ${ctx.from}`);
        return gotoFlow(idleFlow);
    }, ms);
}

// Function to reset the inactivity timer for a user
const reset = (ctx: BotContext, gotoFlow: (a: TFlow) => Promise<void>, ms: number) => {
    stop(ctx);
    if (timers[ctx.from]) {
        console.log(`reset countdown for the user: ${ctx.from}`);
        clearTimeout(timers[ctx.from]);
    }
    start(ctx, gotoFlow, ms);
}

// Function to stop the inactivity timer for a user
const stop = (ctx: BotContext) => {
    if (timers[ctx.from]) {
        clearTimeout(timers[ctx.from]);
    }
}

export {
    start,
    startBot,
    reset,
    stop,
    idleFlow,
}
