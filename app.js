var express = require('express');
var ejs = require('ejs');
var mongoose = require('mongoose');
var fs = require('fs');
var im = require('imagemagick');
var Q = require("q");

var app = express();

var db = mongoose.connect('mongodb://localhost/gallery');


app.use(express.bodyParser({ keepExtensions: true, uploadDir: __dirname + '/images' }));
app.use('/assets',express.static(__dirname + '/assets'));
app.use('/images',express.static(__dirname + '/images'));

var Image = new mongoose.Schema({
    path: String,
    thumb : String,
    description : String
});

var Comment = new mongoose.Schema({
    _imageId : [{type : mongoose.Schema.Types.ObjectId, ref : 'Image'}],
    author: String,
    text: String
});

var ImageModel = mongoose.model( 'Image', Image );
var CommentModel = mongoose.model('Comment', Comment);

app.get('/', function(req, res){
    console.log("GET retrieved");
    try{
        getList(res);
    }catch (e){
        console.log(e);
    }
});

app.post('/', function(req, res) {
    try{
        storeFile(req, res);
    }catch (e){
        console.log(e);
    }

});

app.get("/list/:id", function(req, res){

    getImage(req, res);
});

app.post("/list/", function(req, res){
    var comment = new CommentModel({
        _imageId : req.body.image_id,
        author : req.body.author,
        text : req.body.text
    });
    comment.save(function(err){
        if(err){
            throw err;
        }else{
            res.redirect('/list/' + req.body.image_id);
        }
    })
});

function getList(res){
    return ImageModel.find( function( err, images ) {
        if( err ) throw err;
        var imagesObj = images.length > 0 ? images : {};
        res.render('index.ejs', {
            layout : false,
            images : images
        });
    });
}

function storeFile(req, res){
    var image = req.body.image,
        folder = __dirname + '/images/',
        thumbPath = folder + 'thumbs/' + req.files.image.name,
        newPath = folder + req.files.image.name;
    fs.rename(req.files.image.path, newPath, function (err) {
        if (err) throw err;
        im.resize({
            srcPath: newPath,
            dstPath: thumbPath,
            width:   256
        }, function(err, stdout, stderr){
            if (err) throw err;
            try {
                saveImage(req, res);
            } catch (e){
                console.log(e);
            }
        });
    });
}

function saveImage(req, res){
    var image = new ImageModel({
        path: '/images/' + req.files.image.name,
        thumb: '/images/thumbs/' + req.files.image.name,
        description : req.body.description
    });
    image.save( function( err ) {
        if( !err ) {
            try{
                return getList(res);
            }catch (e){
                console.log(e);
            }
        } else {
            throw err;
        }
    });
}
function getImage(req, res){
    var deferred = Q.defer();
    ImageModel.findById(req.params.id).exec(function(err, image){
        if(err){
            deferred.reject(new Error(err));
        } else {
            deferred.resolve(image);
            getComments(req, res, image);
        }
    });
    return deferred.promise;
}

function getComments(req, res, image){
    CommentModel.find({_imageId : req.params.id}).exec(function(err, comments){
        if(err) throw err;
        var commentsObj = comments.length > 0 ? comments : {};
        res.render('item.ejs',{
            item : image,
            comments : commentsObj
        });
    });
}




app.listen(3000);
console.log('Listening on port 3000');
