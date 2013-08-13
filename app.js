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
    try{
        getList(res);
    }catch (e){
        console.log(e);
    }

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
});

app.post('/', function(req, res) {

    var image = req.body.image,
        imageName = req.files.image.name,
        folder = __dirname + '/images/',
        thumbPath = folder + 'thumbs/' + imageName,
        newPath = folder + imageName,
        imagePath = req.files.image.path,
        desc = req.body.description;

    fileStore()
        .then(thumbStore)
        .then(saveImage)
        .catch(function (error) {
            //res.send(error);
        })
        .done();

    function fileStore(){
        var deferred = Q.defer();
        fs.rename(imagePath, newPath, function (err) {
            if(err){
                deferred.reject(new Error(err));
            }else{
                console.log('saved');
                deferred.resolve();
            }
        });
        return deferred.promise;
    }

    function thumbStore(){
        var deferred = Q.defer();
        console.log('resize start');
        im.resize({
            srcPath: newPath,
            dstPath: thumbPath,
            width:   256
        }, function(err, stdout, stderr){
            if (err){
                deferred.reject(new Error(err));
            }else{
                console.log('resize stop');
                deferred.resolve();
            }
        });
        return deferred.promise;
    }
    function saveImage(){
        var image = new ImageModel({
            path: '/images/' + imageName,
            thumb: '/images/thumbs/' + imageName,
            description : desc
        });
        image.save( function( err ) {
            if( err ) {
                throw err;
            }
            res.redirect("/");
        });
    }

});

app.get("/list/:id", function(req, res){
    var imageId = req.params.id;

    getImage(req, res).then(getComments);


    function getImage(req, res){
        var deferred = Q.defer();
        ImageModel.findById(imageId, function(err, image){
            if(err){
                deferred.reject(new Error(err));
            }else{
                deferred.resolve(image);
            }
        });
        return deferred.promise;
    }

    function getComments(image){
        CommentModel.find({_imageId : imageId}).exec(function(err, comments){
            if(err) throw err;
            var commentsObj = comments.length > 0 ? comments : {};
            res.render('item.ejs',{
                item : image,
                comments : commentsObj
            });
        });
    }
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



app.listen(3000);
console.log('Listening on port 3000');
