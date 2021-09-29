const express = require('express');
const path = require('path');
const {
    check,
    validationResult
} = require('express-validator');

// get expression session
const session = require('express-session');
const fileUpload = require('express-fileupload');

// setting up the DB connection
const mongoose = require('mongoose');
const {
    Console
} = require('console');
mongoose.connect('mongodb://localhost:27017/blogsite', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// set up the model for the post
const Post = mongoose.model('Post', {
    title: String,
    image: String,
    content: String,
    slug: String
});

// set up the model for admin
const Admin = mongoose.model('Admin', {
    username: String,
    password: String
});

class BlogPost {
    constructor(title = '', image = '', content = '', slug = '') {
        this.title = title;
        this.image = image;
        this.content = content;
        this.slug = slug;
    }
}

var credentials = {
    username: '',
    password: ''
};
var postData = new BlogPost();

// set up variables to use packages
var app = express();
app.use(express.urlencoded({
    extended: false
}));

// set up session
app.use(
    session({
        secret: 'xd8O{#?=C+&MZ.WU$.NfoqaE(6,ukl',
        resave: false,
        saveUninitialized: true
    })
);

app.set('views', path.join(__dirname, 'views'));
app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs');
app.use(fileUpload());


// Homepage
app.get('/', (req, res) => {
    Post.find().exec((err, posts) => {
        res.render('home', {
            posts: posts
        });
    });
});

// Login page
app.get('/login', (req, res) => {
    Post.find().exec((err, posts) => {
        res.render('login', {
            credentials: credentials,
            posts: posts
        });
    });
});

// Logout page
app.get('/logout', (req, res) => {
    req.session.username = '';
    req.session.userLoggedIn = false;
    Post.find({}).exec(function (err, posts) {
        res.render('messages', {
            msg: 'Successfully logged out!',
            posts: posts
        });
    });
});

// Validate and process the login form
app.post('/process', [
    check('username', 'Must enter a username.').not().isEmpty(),
    check('password', 'Must enter a password.').not().isEmpty()
], (req, res) => {
    Post.find({}).exec((err, posts) => {
        credentials = {
            username: req.body.username,
            password: req.body.password
        };
        var errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.render('login', {
                message: errors.array(),
                credentials: credentials,
                posts: posts
            });
        } else {
            Admin.findOne({
                username: credentials.username,
                password: credentials.password
            }).exec(function (err, admin) {
                console.log('Error: ', err);
                console.log('Admin: ', admin);
                if (admin) {
                    req.session.username = admin.username;
                    req.session.userLoggedIn = true;
                    res.redirect('/adminpage');
                } else {
                    res.render('login', {
                        message: 'Invalid credentials!',
                        credentials: credentials,
                        posts: posts
                    });
                }
            });
        }
    });
});

// Admin welcome page
app.get('/adminpage', (req, res) => {
    res.render('adminpage', {
        credentials: credentials
    });
});

// Add page with tiny mc editor
app.get('/addpage', (req, res) => {
    res.render('addpage', {
        draft: postData
    });
});

// Validate and publish the blogpost
app.post('/publishpost', [
    check('pageTitle', 'Title can not be blank.').not().isEmpty(),
    check('postslug', 'Slug can not be blank.').not().isEmpty()
], (req, res) => {
    const errors = validationResult(req);
    postData = {
        title: req.body.pageTitle,
        image: req.files.heroImage.name,
        content: req.body.content,
        slug: req.body.postslug
    };

    if (!errors.isEmpty()) {
        res.render('addpage', {
            errors: errors.array(),
            draft: postData
        });
    } else {
        var heroImageName = req.files.heroImage.name;
        var heroImageFile = req.files.heroImage;
        var heroImagePath = 'public/images/' + heroImageName;
        heroImageFile.mv(heroImagePath, function (err) {
            console.log(err);
        });

        var myPost = new Post(postData);
        myPost.save();
        res.render('adminmessages', {
            msg : 'Post published successfully!'
        });
    }
});

// Delete a blogpost from the website and database
app.get('/delete/:postid', (req, res) => {
    if (req.session.userLoggedIn) {
        var postid = req.params.postid;
        Post.findByIdAndDelete({
            _id: postid
        }).exec(function (err, post) {
            console.log('Error  : ' + err);
            console.log('Post id: ' + post._id);
            if (post) {
                res.render('adminmessages', {
                    msg: 'Successfully deleted!',
                });
            } else {
                res.render('adminmessages', {
                    msg: 'Sorry, could not delete!'
                });
            }
        });
    } else {
        res.redirect('/login');
    }
});

// Edit a blogpost from the website and then save to the DB
app.get('/edit/:postid', (req, res) => {
    if (req.session.userLoggedIn) {
        var postid = req.params.postid;
        Post.findOne({
            _id: postid
        }).exec(function (err, post) {
            console.log('Error  : ' + err);
            console.log('Post id: ' + post._id);
            if (post) {
                res.render('edit', {
                    draft: post
                });
            } else {
                res.render('adminmessages', {
                    msg: 'Sorry! Post could not be located.'
                });
            }
        });
    } else {
        res.redirect('/login');
    }
});

// Process and publish the edited blogpost
app.post('/edit/:id', [
    check('pageTitle', 'Title can not be blank.').not().isEmpty(),
    check('postslug', 'Slug can not be blank.').not().isEmpty()
], function (req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        var postid = req.params.id;
        Post.findOne({
            _id: postid
        }).exec(function (err, post) {
            console.log('Error  : ' + err);
            console.log('Post id: ' + post._id);
            if (post) {
                res.render('edit', {
                    post: post,
                    errors: errors.array()
                });
            } else {
                res.render('adminmessages', {
                    msg: 'No post found with that id.'
                });
            }
        });
    } else {
        var heroImageName = req.files.heroImage.name;
        var heroImageFile = req.files.heroImage;
        var heroImagePath = 'public/images/' + heroImageName;
        heroImageFile.mv(heroImagePath, function (err) {
            console.log(err);
        });

        postData = {
            title: req.body.pageTitle,
            image: req.files.heroImage.name,
            content: req.body.content,
            slug: req.body.postslug
        };

        var id = req.params.id;
        Post.findOne({
            _id: id
        }, function (err, post) {
            post.title = postData.title;
            post.image = postData.image;
            post.content = postData.content;
            post.slug = postData.slug;
            post.save();
        });
        res.render('adminmessages', {
            msg: 'Post published successfully'
        });
    }
});

// Displaying all the posts in the database
app.get('/allposts', (req, res) => {
    Post.find({}).exec(function (err, posts) {
        console.log('Error: ', err);
        console.log('Posts : ', posts);
        if (req.session.userLoggedIn) {
            res.render('allposts', {
                posts: posts
            });
        } else {
            console.log('User is not logged in.');
            res.render('messages', {
                msg: `You must be logged in first.`,
                posts: posts
            });
        }
    });
});

// Displaying a specific blogpost
app.get('/:postid', (req, res) => {
    Post.find({}).exec(function (err, posts) {
        var searchId = req.params.postid;
        Post.findOne({
            _id: searchId
        }).exec(function (err, post) {
            if (post) {
                res.render('template', {
                    blog: post,
                    posts: posts
                });
            } else {
                res.render('messages', {
                    msg: 'No post found with that id.',
                    posts: posts
                });
            }
        });
    });

});

app.listen(3000);
console.log('Everything executed fine.. website at port 3000....');