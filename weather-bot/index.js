// 必要なパッケージを読み込む
require('dotenv').config();
const fs = require('fs');
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const schedule = require('node-schedule');

// Discordクライアントの初期化
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
});

// デフォルトの都市（行橋市）
let currentCity = 'Yukuhashi,Fukuoka,JP';
let currentCoords = { lat: 33.7287, lon: 130.983 };

// 都市名から緯度・経度を取得
const getCoordinatesFromCity = async (cityName) => {
  const apiKey = process.env.WEATHER_API_KEY;
  const url = `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(cityName)}&limit=5&appid=${apiKey}`;

  try {
    const res = await axios.get(url);
    const results = res.data;

    if (results.length === 0) {
      return { error: '都市が見つかりませんでした。例: `Change/Shinagawa,Tokyo,JP` のように入力してください。' };
    }

    if (results.length === 1) {
      const { lat, lon, name, country, state } = results[0];
      return { lat, lon, name, country, state };
    }

    const candidates = results.map(r => `${r.name}${r.state ? ', ' + r.state : ''}, ${r.country}`);
    return { candidates };
  } catch (err) {
    console.error('座標取得失敗:', err.message);
    return { error: 'エラーが発生しました。' };
  }
};

// 天気情報の取得
const getRealtimeWeather = async () => {
  const apiKey = process.env.WEATHER_API_KEY;
  const { lat, lon } = currentCoords;
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=ja`;

  try {
    const res = await axios.get(url);
    const data = res.data;

    const weather = data.weather[0].description;
    const temp = data.main.temp;
    const wind = data.wind.speed;
    const rain = data.rain?.['1h'] ?? 0;
    const pop = rain > 0 ? 'あり' : 'なし';

    return { weather, temp, wind, pop };
  } catch (err) {
    console.error('リアルタイム天気取得失敗:', err.message);
    return null;
  }
};

// Embed形式での出力構築
const buildEmbed = (data, label) => {
  return new EmbedBuilder()
    .setTitle(`☀️ ${currentCity} の${label}の天気`)
    .addFields(
      { name: '天気', value: data.weather, inline: true },
      { name: '気温', value: `${data.temp}℃`, inline: true },
      { name: '風速', value: `${data.wind} m/s`, inline: true },
      { name: '降水（1時間以内）', value: data.pop, inline: true }
    )
    .setColor(0x1e90ff)
    .setTimestamp()
    .setFooter({ text: 'OpenWeatherMap APIより取得' });
};

// Bot準備完了時の処理
client.once('ready', async () => {
  const now = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
  const loginMessage = `[${now}] ✅ ${client.user.tag} がログインしました！`;

  console.log(loginMessage);
  fs.appendFileSync('log.txt', loginMessage + '\n');

  // 自動スケジュール処理（日本時間ベース）
  const times = [
    { cron: '0 8 * * *', label: '8時' },
    { cron: '0 12 * * *', label: '12時' },
    { cron: '0 17 * * *', label: '17時' },
  ];

  const channel = await client.channels.fetch(process.env.CHANNEL_ID).catch(err => {
    console.error('チャンネル取得エラー:', err.message);
    return null;
  });

  if (!channel || !channel.isTextBased()) {
    console.error('有効なテキストチャンネルが取得できませんでした。');
    return;
  }

  times.forEach(({ cron, label }) => {
    schedule.scheduleJob(cron, async () => {
      const weather = await getRealtimeWeather();
      if (!weather) return;

      const embed = buildEmbed(weather, label);
      channel.send({ embeds: [embed] });

      const logTime = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
      fs.appendFileSync('log.txt', `[${logTime}] 📤 ${label}の天気を送信しました。\n`);
    });
  });
});

// メッセージ受信時の処理
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content.startsWith('Change/')) {
    const inputCity = message.content.split('/')[1].trim();
    const result = await getCoordinatesFromCity(inputCity);

    if (result.error) return message.reply(`❌ ${result.error}`);

    if (result.candidates) {
      const list = result.candidates.map((c, i) => `${i + 1}. ${c}`).join('\n');
      return message.reply(
        `🔍 入力に一致する都市が複数見つかりました。\nもう少し具体的に入力してください。\n\n**候補:**\n${list}`
      );
    }

    currentCity = `${result.name}, ${result.country}`;
    currentCoords = { lat: result.lat, lon: result.lon };
    return message.reply(`✅ 天気の都市を「${currentCity}」に変更しました。`);
  }

  if (message.content === 'now city') {
    return message.reply(`🌍 現在の都市設定は「${currentCity}」です。`);
  }

  if (message.content === '!天気') {
    const data = await getRealtimeWeather();
    if (!data) return message.reply('天気情報の取得に失敗しました。');

    const embed = buildEmbed(data, '現在');
    message.reply({ embeds: [embed] });
  }
});

// Discordトークンでログイン
client.login(process.env.DISCORD_TOKEN);
