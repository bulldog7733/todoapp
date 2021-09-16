const express = require('express');
const app = express();

app.use(express.urlencoded({extended: true})); 
const MongoClient = require('mongodb').MongoClient;
const methodOverride = require('method-override');
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');
app.use('/public', express.static('./public/'));

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');

app.use(session({secret : '비밀코드', resave : true, saveUninitialized: false}));
app.use(passport.initialize());
app.use(passport.session()); 

require('dotenv').config();

var db;
MongoClient.connect(process.env.DB_URL, function(에러, client){
    if (에러) return console.log(에러);

    db = client.db('todoapp');

    // db.collection('post').insertOne({이름: 'John', _id: 100}, function(에러, 결과){
    //     console.log('저장완료');
    // });

    //서버띄우는 코드 여기로 옮기기
    app.listen(process.env.PORT, function(){
      console.log('listening on 8080')
    });
});


app.get('/pet', function(요청, 응답) { 
    응답.send('펫용품 쇼핑할 수 있는 페이지입니다.');
});

app.get('/beauty', function(요청, 응답) { 
    응답.send('뷰티용품 쇼핑할 수 있는 페이지입니다.');
});

app.get('/', function(요청, 응답) { 
    응답.render('index.ejs')
});

app.get('/write', function(요청, 응답) { 
    응답.render('write.ejs')
});



// 누가 /list로 GET 요청으로 접속하면,
// 실제 DB 에 저장된 데이터들로 예쁘게 꾸며진 HTML 을 보여줌

app.get('/list', function(요청, 응답){
    // 디비에 저장된 post 라는 collection 안의 모든 데이터를 꺼내주세요
    db.collection('post').find().toArray(function(에러, 결과){
        // console.log(결과);
        응답.render('list.ejs', {posts : 결과});
    });        
});


// /detail로 접속하면 detail.ejs 를 보여줌

app.get('/detail/:id', function(요청, 응답){
    console.log(요청.params.id);       
    db.collection('post').findOne({_id: parseInt(요청.params.id)}, function(에러, 결과){                     
        console.log(결과);
        if(결과 == null){
            응답.send('404에러: 페이지를 찾을 수 없어요');
        } else{
            응답.render('detail.ejs', {데이터 : 결과});   
        }             
    });               
});


app.get('/edit/:id', function(요청, 응답){
    db.collection('post').findOne({_id: parseInt(요청.params.id)}, function(에러, 결과){
        if(결과 == null){
            응답.send('404에러: 페이지를 찾을 수 없어요');
        } else{
            응답.render('edit.ejs', {포스트 : 결과});              
        } 
    });
    
});


app.put('/edit', function(요청, 응답){
    db.collection('post').updateOne({_id: parseInt(요청.body.id)}, {$set: {제목: 요청.body.title, 날짜: 요청.body.date}}, function(에러, 결과){
        console.log('수정완료');
        응답.redirect('/list');
    })
});



passport.use(new LocalStrategy({
    usernameField: 'id',
    passwordField: 'pw',
    session: true,
    passReqToCallback: false,
  }, function (입력한아이디, 입력한비번, done) {
    //console.log(입력한아이디, 입력한비번);
    db.collection('login').findOne({ id: 입력한아이디 }, function (에러, 결과) {
      if (에러) return done(에러)
  
      if (!결과) return done(null, false, { message: '존재하지않는 아이디요' })
      if (입력한비번 == 결과.pw) {
        return done(null, 결과)
      } else {
        return done(null, false, { message: '비번틀렸어요' })
      }
    })
}));

passport.serializeUser(function (user, done) {
    done(null, user.id)
});

passport.deserializeUser(function (아이디, done) {
    db.collection('login').findOne({id : 아이디}, function(에러, 결과){
        done(null, {결과})
    })    
}); 

app.post('/register', function (요청, 응답) {
    db.collection('login').findOne({id : 요청.body.id}, function(에러, 결과){
        console.log(결과);
        if(결과 != null){
            응답.send('이용할 수 없는 아이디입니다');
        } else{
            db.collection('login').insertOne({ id: 요청.body.id, pw: 요청.body.pw, name: 요청.body.username }, function (에러, 결과) {
                응답.redirect('/')
              })
        }
    })                   
});


app.get('/login', function(요청, 응답){
    응답.render('login.ejs');
});

app.post('/login', passport.authenticate('local', {failureRedirect : '/fail'}), function(요청, 응답){
    응답.redirect('/');
});

app.get('/mypage', 로그인했니, function (요청, 응답) {    
    응답.render('mypage.ejs', { 사용자 : 요청.user });
    console.log(요청.user);
}); 

function 로그인했니(요청, 응답, next){
    if(요청.user){
        next();
    } else{
        응답.send('로그인 안하셨는데요?');
    }
};


// 어떤 사람이 /add 라는 경로로 post 요청을 하면,
// 데이터 2개(날짜, 제목)를 보내주는데,
// 이 때, 'post'라는 이름을 가진 collection 에 두개 데이터를 저장하기
// { 제목: '어쩌구', 날짜: '어쩌구' }


app.post('/list', function(요청, 응답){
    응답.send('전송완료');    
    db.collection('counter').findOne({name:'게시물갯수'}, function(에러, 결과){
        console.log(결과.totalPost);
        var 총게시물갯수 = 결과.totalPost;               
        var 저장할거 = {_id : 총게시물갯수 + 1, 아이디: 요청.user["결과"]._id, 작성자: 요청.user["결과"].id, 제목 : 요청.body.title, 날짜 : 요청.body.date}
        db.collection('post').insertOne(저장할거, function(에러, 결과){
            console.log('저장완료');
            // counter라는 콜렉센에 있는 totoalPost 라는 항목도 1 증가시켜야 함(수정);
            db.collection('counter').updateOne({name:'게시물갯수'}, { $inc: {totalPost:1} }, function(에러, 결과){
                if(에러){return console.log(에러)};
            });
        });              
    });      
});


app.delete('/delete', function(요청, 응답){
    // console.log(요청.body);
    요청.body._id = parseInt(요청.body._id);
    
    // console.log(요청.user);
    
    if(!요청.user){
        console.log('로그인이 안되었어요');
    } else{
        var 삭제할데이터 = {_id : 요청.body._id, 아이디 : 요청.user['결과']._id }
        // 요청.body에 담겨온 게시물번호를 가진 글을 db에서 찾아서 삭제해주세요
        db.collection('post').deleteOne(삭제할데이터, function(에러, 결과){     
            if(결과.deletedCount == 0){
                console.log('삭제할 권한이 없습니다');
            } else{
                console.log(결과);
                응답.status(200).send({ message : '성공했습니다' });
            }
            
        })
    }
    
})



app.get('/search', (요청, 응답)=>{
    var 검색조건 = [
        {
          $search: {
            index: 'titelSearch',
            text: {
              query: 요청.query.value,
              path: '제목'  // 제목날짜 둘다 찾고 싶으면 ['제목', '날짜']
            }
          }
        },
        { $project : { 제목 : 1, _id : 0, score: {$meta: 'searchScore'} } },
    ] 
    console.log(요청.query.value);
    db.collection('post').aggregate(검색조건).toArray((에러, 결과)=>{
        console.log(결과);
        응답.render('search.ejs', {posts : 결과});
    });
});



app.use(function(req, res, next) {
    res.status(404).send('404: File 을 찾을 수 없어요');
});

