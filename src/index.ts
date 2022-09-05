import express, { json } from "express";
import dotenv from 'dotenv'
import cors from 'cors'
import cardRouter from "./router/cardRouter";
import errorHandler from "./middlewares/errorHandler";

const app = express()

dotenv.config()

app.use(cors())
app.use(json())
app.use(cardRouter)
app.use(errorHandler)

const PORT: number = Number(process.env.PORT) || 5009

app.listen(PORT, () => console.log(`Running on PORT ${PORT}`))
