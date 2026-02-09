import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { readFile } from 'fs/promises'

const app = express()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DATA_DIR = path.join(__dirname, 'monthly-flood-data')

// 모든 응답에 CORS 헤더 붙이기 (404 포함)
app.use(cors({ origin: '*' }))

// 정적 파일 제공 (./monthly-flood-data/ 아래에 json 파일 배치)
app.use('/monthly-flood-data', express.static(DATA_DIR))

// queryString 기반 침수 데이터 조회
app.get('/api/flood-data', async (req, res) => {
  const year = Number(req.query.year)
  const month = Number(req.query.month)

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return res.status(400).json({
      error: {
        code: 'INVALID_PARAMS',
        message: 'year(정수)와 month(1~12 정수)는 필수 파라미터입니다.'
      }
    })
  }

  const filename = `flood_data_${year}_${String(month).padStart(2, '0')}.json`
  const filePath = path.join(DATA_DIR, filename)

  try {
    const raw = await readFile(filePath, 'utf-8')
    res.json(JSON.parse(raw))
  } catch (err) {
    if (err.code === 'ENOENT') {
      return res.status(404).json({
        error: {
          code: 'DATA_NOT_FOUND',
          message: `${year}년 ${month}월 침수 데이터가 존재하지 않습니다.`
        }
      })
    }
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: '서버 내부 오류가 발생했습니다.' }
    })
  }
})

// 404 처리 (CORS 헤더 포함됨)
app.use((req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not Found' } })
})

const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log(`Server running on ${port}`)
})
