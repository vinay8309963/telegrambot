// https://t.me/weather12390_bot
// @weather12390_bot

require('dotenv').config()

const TelegramBot = require('node-telegram-bot-api')
const axios = require('axios')

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const WEATHER_API_KEY = process.env.WEATHER_API_KEY

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true })

const storage = {}

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id
  bot.sendMessage(
    chatId,
    'Hello! This bot can show you the weather for any city. To use it, please choose an option below:',
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Get Weather', callback_data: 'get_weather' }],
        ],
      },
    }
  )
})

bot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id
  const data = callbackQuery.data

  switch (data) {
    case 'get_weather':
      const userDataWeather = getUserData(chatId)
      userDataWeather.waitingForCity = true
      userDataWeather.waitingForWeather = true
      bot.sendMessage(
        chatId,
        'Please enter the name of the city or send /stop to cancel:'
      )
      break
    default:
      break
  }
})

bot.on('message', async (msg) => {
  const chatId = msg.chat.id
  const text = msg.text

  const userData = getUserData(chatId)
  if (userData && userData.waitingForCity) {
    const city = text
    let messageText = ''
    try {
      if (userData.waitingForWeather) {
        messageText = await getWeatherData(city)
      }
      bot.sendMessage(chatId, messageText)
    } catch (error) {
      bot.sendMessage(chatId, `Sorry, an error occurred. ${error.message}`)
    }
    resetUserData(chatId)
  }
})

bot.onText(/\/stop/, (msg) => {
  const chatId = msg.chat.id
  bot.sendMessage(chatId, 'You have stopped the current operation.')
  resetUserData(chatId)
})


/**
 * This function retrieves weather data for a given city using the Visual Crossing Weather API.
 * @param {string} city - The name of the city to retrieve weather data for.
 * @returns {string} - A formatted message containing the weather data for the city.
 */
async function getWeatherData(city) {
  // Make a GET request to the Visual Crossing Weather API to retrieve weather data for the city
  const response = await axios.get(
    `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${city}?unitGroup=us&key=${WEATHER_API_KEY}`
  )

  // Extract the necessary information from the API response
  const { resolvedAddress, timezone, days } = response.data

  // Format the data into a message
  let message = `Weather for ${resolvedAddress} (${timezone}):\n\n`
  days.forEach((day) => {
    const date = new Date(day.datetimeEpoch * 1000).toLocaleDateString()
    const temperature = Math.round((day.temp - 32) * (5 / 9))
    const description = day.description
    message += `${date}: ${temperature}°C, ${description}\n`
  })

  // Return the formatted message
  return message
}


function getUserData(chatId) {
  let userData = storage[chatId]
  if (!userData) {
    userData = {
      waitingForCity: false,
      waitingForWeather: false,
    }
    storage[chatId] = userData
  }
  return userData
}

function resetUserData(chatId) {
  const userData = getUserData(chatId)
  userData.waitingForCity = false
  userData.waitingForWeather = false
}
