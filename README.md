_From the series "Stellar Guide"_

# Hubble 🔭

> _The eye that watches the sky — so you don't have to._

A lightweight data aggregation service for weather and air quality, built on [Elysia](https://elysiajs.com/) and Bun. Hubble orbits the atmosphere in silence, fetching, caching, and publishing environmental data from OpenWeather and IQAir.

## 🌌 Philosophy

> _Hubble: A space telescope named after Edwin Hubble, pointed at the universe, quietly observing._

Most services demand you reach out to the world yourself. Hubble handles the looking. It watches the sky, remembers what it saw, and tells you — with Redis caching so the same coordinates don't need asking twice, and Kafka publishing so the data flows onward wherever it needs to go.

It degrades gracefully. No Redis? It runs cache-free. No Kafka? It stays a clean REST API. No API key? That module goes dark — the rest keeps orbiting.

**Built on [Bun](https://bun.sh/) and [Elysia](https://elysiajs.com/), pointed at the sky.**

## ✨ Features

- 🌤 **Weather** — current conditions via OpenWeather (`/api/v1/openweather/data`)
- 🌫 **Air quality** — AQI and pollution data via IQAir (`/api/v1/aqi/data`)
- ⚡ **Redis caching** — coordinate-bucketed, TTL-based, cache-free fallback if unavailable
- 📡 **Kafka publishing** — push data downstream to `hubble-openweather` / `hubble-aqi`
- 🧹 **Cache invalidation** — `DELETE /cache` per module manually, or let it expire
- 📖 **Swagger docs** — auto-generated at `/swagger`
- 🔇 **Silent degradation** — missing config disables the module, not the service

## 🚀 Getting Started

```bash
bun install
cp .env.example .env   # fill in your keys
bun run dev
```

Service starts at `http://localhost:3000`.

## 🛰 Environment

See [`.env.example`](.env.example) for the full reference. No variable is strictly required — Hubble is designed to operate with whatever it's given.

| Variable                        | Purpose                   |
| ------------------------------- | ------------------------- |
| `OPENWEATHER_API_KEY`           | OpenWeather module        |
| `AQAIR_API_KEY`                 | Air quality module        |
| `REDIS_ENDPOINT` / `REDIS_PORT` | Caching layer             |
| `KAFKA_ENDPOINT` / `KAFKA_PORT` | Event publishing          |
| `PORT`                          | HTTP port (default: 3000) |

## 🌍 API

All endpoints accept `?lat=&lon=` query parameters.

```
GET  /api/v1/openweather/data
GET  /api/v1/aqi/data

POST   /api/v1/openweather/publish
POST   /api/v1/aqi/publish

DELETE /api/v1/openweather/cache
DELETE /api/v1/aqi/cache
```
