const express= require('express')
const app = express()
const port = 3000

app.use(express.static('public'))
app.use('/css',express.static(__dirname+'public/css'))
// app.use('/css',express.static(__dirname+'/public/css'))

app.get('',(req,res)=>{
    res.sendFile(__dirname+'/public/html/index.html')
})

app.listen(port,() => console.info('lisening on port ${port}'))