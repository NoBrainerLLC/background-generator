if(process.env.NODE_ENV !== 'production'){
    require('dotenv').config();
}
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const path = require('path');
const Field = require('./models/field');
const Folder = require('./models/folder');
const Tag = require('./models/tag');
const Compartment = require('./models/compartment');
const Document = require('./models/document');
const methodOverride = require('method-override');
const ejsMate = require('ejs-mate');
const multer = require('multer');
const {storage, cloudinary } = require('./cloudinary');
const upload = multer({storage});
const streamifier = require('streamifier')
const catchAsync = require('./utils/catchAsync')
const ExpressError = require('./utils/ExpressError')
const Joi = require('joi');
mongoose.connect('mongodb://localhost:27017/fileApp', {useNewUrlParser: true, useUnifiedTopology: true})
    .then(()=>{
        console.log('Mongoose connected')
    })
    .catch(e =>{
        console.log('Mongoose error')
        console.log(e)
    });

app.set('view engine','ejs');
app.set('views', path.join(__dirname,'/views'));
app.use(methodOverride('_method'));
app.use(express.urlencoded({extended: true}))
app.engine('ejs', ejsMate)


app.get('/', (req,res)=>{
    res.render('home')
})

app.get('/document', async(req,res)=>{
    const documents = await Document.find({}).populate('tag').populate('compartment')
    res.render('document/index', {documents})
})

app.get('/document/new', async(req,res)=>{
    res.render('document/new')
})


app.post('/document',upload.single('files'), async (req,res)=>{
    try{
        const test = cloudinary.uploader.upload(req.file.path,{
            resource_type: 'raw',
            raw_convert:'aspose'
        },function(error, result){console.log(result)})
        console.log(req.file,req.body)
        res.redirect('/document')
    }
    catch(err) { console.log(err)}
})

app.get('/folder', async(req,res)=>{
    const folders = await Folder.find({})
    const countFold = await Folder.count({})
    res.render('folder/index',{folders, countFold})
})

app.get('/folder/new', (req,res)=>{
    res.render('folder/new')
})

app.post('/folder', async(req,res)=>{
    const newFolder = new Folder(req.body);
    await newFolder.save();
    res.redirect('/folder')
})

app.get('/folder/:id', async (req,res)=>{
    const folder = await Folder.findById(req.params.id).populate('compartment');
    res.render('folder/show',{folder})
})

app.get('/folder/:id/compartment/new', async(req,res)=>{
    const {id}=req.params;
    const folder = await Folder.findById(id);
    res.render('compartment/new', {folder})
})

app.post('/folder/:id/compartment', async(req,res)=>{
    const {id}= req.params;
    const folder = await Folder.findById(id);
    const {name, concat} = req.body;
    const compartment = new Compartment({name, concat});
    folder.compartment.push(compartment);
    compartment.folder =folder;
    await folder.save();
    await compartment.save();
    res.redirect(`/folder/${id}`)
})


app.get('/compartment/:id/tag/new', async (req,res)=>{
    const {id}=req.params;
    const compartment = await Compartment.findById(id);
    res.render('tag/new',{compartment})
})

app.post('/compartment/:id/tag', async (req,res)=>{
    const {id} = req.params;
    const compartment = await Compartment.findById(id);
    const newTag = new Tag(req.body);
    compartment.tag.push(newTag);
    await newTag.save();
    await compartment.save();
    res.redirect(`/compartment/${id}`)
})
app.get('/compartment/:id', async(req,res)=>{
    const {id}=req.params;
    const compartment = await Compartment.findById(id).populate('tag');
    res.render('compartment/show', {compartment})
})

app.get('/tag', async(req,res)=>{
    const {name} = req.query;
    if(name){
        const tags = await Tag.find({name: name})
        res.render('tag/index', {tags})
    } 
    else {
        const tags = await Tag.find({});
        res.render('tag/index', {tags})
    }
})

app.get('/tag/:id', async(req,res)=>{
    const tags = await Tag.findById(req.params.id).populate('field');
    if(tags.field.length === 0){
        console.log('sorry');
    }else{
        console.log(tags.field[0]._id)
    }
    res.render('tag/show', {tags})
})

app.get('/tag/:id/field/new', async (req,res)=>{
    const {id} = req.params;
    const tags = await Tag.findById(id)
    console.log(tags)
    res.render('field/new', {tags})
})

app.post('/tag/:id/field', async (req,res)=>{
    const {id}=req.params;
    const tag = await Tag.findById(id);
    const {name}=req.body;
    const field = new Field({name});
    tag.field.push(field);
    field.tag = tag;
    await field.save();
    await tag.save();
    res.redirect(`/tag/${id}`)
})

app.get('/field', async (req,res)=>{
    const {name} = req.query;
    //console.log(name)
    if(name){
        const fields = await Field.find({name}).populate('tag').populate('compartment');
        res.render('field/index', {fields})
    } else{
        const fields = await Field.find({}).populate('tag').populate('compartment');
        res.render('field/index', {fields})
    }
    
})



app.get('/Test', async (req,res)=>{
    const {name} = req.query;
    const folder = await Folder.find({});
    const compartment = await Compartment.find({}).populate('tag');
    const tags = await Tag.find({}).populate('field')
    const fields = await Tag.find({name}).populate('field')
    console.log(tags)
    res.render('Test', {tags})
    
})

app.all('*',(req,res,next)=>{
    next(new ExpressError('Page not found', 404))
})
app.use((err,req,res,next)=>{
    const {statusCode=500, message ='something went wrong'} = err
    res.status(statusCode).send(message);
})

app.listen(8080, ()=>{
    console.log('App is live')
})