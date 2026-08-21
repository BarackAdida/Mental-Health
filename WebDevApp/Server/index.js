require('dotenv').config();
const express = require('express')
const cors = require('cors')
const session = require('express-session')
const authRoutes = require('./routes/auth')
const doctorRoutes = require('./routes/doctors')
const eventRoutes = require('./routes/events');

const app = express();
const PORT = process.env.PORT || 5000

app.use(session({
    secret: process.env.SESSION_SECRET || 'default_secret',
    resave: false,
    saveUnitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    }
}))

app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}))

app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/doctors', doctorRoutes)
app.use('/api/events', eventRoutes)

app.get('/', (req, res) => {
    res.send('API running');
})

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
})