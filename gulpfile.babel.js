import gulp from 'gulp';
import gulploadplugins from 'gulp-load-plugins';
import yargs from 'yargs';
import browserSync from 'browser-sync';
import browserify from 'browserify';
import babelify from 'babelify';
import source from 'vinyl-source-stream';
import buffer from 'vinyl-buffer';
import path from 'path';
import del from 'del';
import handlebars from 'gulp-compile-handlebars';

const $ = gulploadplugins({
  lazy: true
});

const argv = yargs.argv;

function handleError(error) {
  $.util.log(error.message);
  $.util.log(error.codeFrame);
  this.emit('end');
}

// SASS Styles
gulp.task('styles', () => {
  return gulp.src([
    'src/vendor/**/*.css',
    'src/sass/*.scss'
  ])
    .pipe($.changed('.tmp/styles', {extension: '.css'}))
    .pipe($.if(!argv.production, $.sourcemaps.init()))
    .pipe($.sassVariables({
       $production: (argv.production == true)
     }))
    .pipe($.sass({
      precision: 10
    }).on('error', $.sass.logError))
    .pipe($.autoprefixer())
    .pipe(gulp.dest('.tmp'))
    // Concatenate and minify styles if production mode (via gulp styles --production)
    .pipe($.if('*.css' && argv.production, $.cleanCss()))
    .pipe($.if(!argv.production, $.sourcemaps.write()))
    .pipe(gulp.dest('public/css'))
    .pipe(browserSync.stream())
    .pipe($.size({title: 'styles.css'}));
});

// Scripts - app.js is the main entry point, you have to import all required files and modules
gulp.task('scripts', () => {
  return browserify({
    entries: 'src/js/app.js',
    debug: true
  })
    .transform('babelify', {presets: ['es2015']})
    .bundle()
      .on('error', handleError)
    .pipe(source('app.js'))
    .pipe(buffer())
    .pipe($.if(!argv.production, $.sourcemaps.init({loadMaps: true})))
    .pipe($.if(argv.production, $.uglify()))
      .on('error', handleError)
    .pipe($.if(!argv.production, $.sourcemaps.write()))
    .pipe(gulp.dest('./public/js'))
    .pipe($.size({title: 'app.js'}));
});

gulp.task('static', () => {
  return gulp.src('src/**/*.{html,php,jpg,jpeg,png,gif,webp,mp4,svg,ico,eot,ttf,woff,woff2,otf}').pipe(gulp.dest('public'));
});

gulp.task('templates', () => {
  return gulp.src([
    'src/**/*.hbs',
    '!src/partials/*.hbs'
  ])
    .pipe(handlebars({}, {
      batch: 'src/partials'
    }))
    .pipe($.rename((path) => {
      path.extname = '.html'
    }))
    .pipe(gulp.dest('public'));
});

// Browser-Sync
gulp.task('serve', ['styles', 'scripts', 'templates', 'static'], () => {
  browserSync({
    notify: false,
    server: ['.tmp', 'public'],
    reloadDelay: 100
  });

  gulp.watch(['src/sass/**/*.{scss,css}'], ['styles']);
  gulp.watch(['src/js/**/*.js'], ['scripts']).on('change', browserSync.reload);
  gulp.watch(['src/**/*.hbs'], ['templates']).on('change', browserSync.reload);
  gulp.watch(['src/**/*.{html,php,jpg,jpeg,png,gif,webp,mp4,svg,ico,eot,ttf,woff,woff2,otf}'], ['static']).on('change', (event) => {
    browserSync.reload();
    if(event.type === 'deleted') {
      let filePathFromSrc = path.relative(path.resolve('src'), event.path);
      let destFilePath = path.resolve('public', filePathFromSrc);
      console.log(`deleting ${destFilePath}...`);
      del.sync(destFilePath);
    }
  });
});

gulp.task('build', ['styles', 'scripts', 'templates', 'static']);
