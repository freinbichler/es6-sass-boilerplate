const gulp = require('gulp');
const gulploadplugins = require('gulp-load-plugins');
const yargs = require('yargs');
const browserSync = require('browser-sync');
const browserify = require('browserify');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const path = require('path');
const rimraf = require('rimraf');
const handlebars = require('gulp-compile-handlebars');
const notifier = require('node-notifier');
const sass = require('gulp-sass')(require('sass'));
const log = require('fancy-log');
const c = require('ansi-colors');

const $ = gulploadplugins({
  lazy: true
});

const argv = yargs.argv;

function handleError(error) {
  log('⚠️ ⚠️ ⚠️');
  log(c.red(error.message));
  if(error.codeFrame) {
    log(error.codeFrame);
  }
  const fileName = error.filename || error.file;
  notifier.notify({
    title: `Error: ${fileName ? fileName.split('/').pop() : ''}`,
    message: error.message.split(':').slice(1)
  });
  process.exitCode = 1;
  this.emit('end');
}

// SASS Styles
gulp.task('styles', () => {
  return gulp.src([
    'src/vendor/**/*.css',
    'src/sass/*.scss'
  ])
    .pipe($.changed('.tmp/styles', { extension: '.css' }))
    .pipe($.sassVariables({
       $production: (argv.production == true)
     }))
    .pipe(sass({
      precision: 10
    }).on('error', handleError))
    .pipe($.autoprefixer())
    .pipe(gulp.dest('.tmp'))
    // Concatenate and minify styles if production mode (via gulp styles --production)
    .pipe($.if('*.css' && argv.production, $.cleanCss()))
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
    .transform('babelify', { presets: ['@babel/preset-env'] })
    .bundle()
      .on('error', handleError)
    .pipe(source('app.js'))
    .pipe(buffer())
    .pipe($.if(argv.production, $.uglify()))
      .on('error', handleError)
    .pipe(gulp.dest('./public/js'))
    .pipe($.size({title: 'app.js'}));
});

// a task that ensures the `scripts` task is complete before reloading browsers
gulp.task('scripts-reloader', gulp.series('scripts', (done) => {
  browserSync.reload();
  done();
}));

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
gulp.task('serve', gulp.series('styles', 'scripts', 'templates', 'static', () => {
  browserSync({
    notify: false,
    server: ['.tmp', 'public']
  });

  gulp.watch(['src/sass/**/*.{scss,css}'], gulp.series('styles'));
  gulp.watch(['src/js/**/*.js'], gulp.series('scripts-reloader'));
  gulp.watch(['src/**/*.hbs'], gulp.series('templates')).on('all', browserSync.reload);
  gulp.watch(['src/**/*.{html,php,jpg,jpeg,png,gif,webp,mp4,svg,ico,eot,ttf,woff,woff2,otf}'], gulp.series('static'))
    .on('all', () => {
      browserSync.reload();
    })
    .on('unlink', (filePath) => {
      let srcFilePath = path.relative(path.resolve('src'), filePath);
      let publicFilePath = path.resolve('public', srcFilePath);
      log(c.red(`🗑️  deleting ${publicFilePath}...`));
      rimraf.sync(publicFilePath);
    });
}));

gulp.task('build', gulp.series('styles', 'scripts', 'templates', 'static'));
