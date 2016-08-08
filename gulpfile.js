var gulp = require('gulp');
var usemin = require('gulp-usemin');
var uglify = require('gulp-uglify');
var minifyCss = require('gulp-clean-css');
var imagemin = require('gulp-imagemin');
var sass = require('gulp-sass');
var browserSync = require('browser-sync').create();
var autoprefixer = require('gulp-autoprefixer');

gulp.task('libraries', function() {
	gulp.src('bower_components/holderjs/holder.min.js')
	.pipe(gulp.dest('resources/holderjs/'));
	return gulp.src('bower_components/*/dist/**/*')
	.pipe(gulp.dest('resources/'));
});

gulp.task('uglify_js', function() {
	return gulp.src('resources_src/js/*.js')
	.pipe(uglify())
	.pipe(gulp.dest('resources/js/'));
});

gulp.task('sass', function () {
  return gulp.src('resources_src/css/*.scss')
    .pipe(sass().on('error', sass.logError))
    .pipe(autoprefixer())
    .pipe(cleanCSS())
    .pipe(gulp.dest('resources/css/'))
	.pipe(browserSync.stream());
});

gulp.task('minify_images', function() {
	return gulp.src('resources_src/image/**/*')
	.pipe(imagemin())
	.pipe(gulp.dest('resources/image/'));
})

gulp.task('watch', function() {
	browserSync.init({
        proxy: "shiqingqi.com"
    });

	gulp.watch('resources_src/css/*.scss', ['sass']);
	gulp.watch('resources_src/js/*.js', ['uglify_js'])
	.on('change', browserSync.reload);
	gulp.watch('resources_src/image/**/*', ['minify_images'])
	.on('change', browserSync.reload);
	gulp.watch(['**/*.html', '**/*.php'])
	.on('change', browserSync.reload);
});

gulp.task('default',
	['libraries',
	'uglify_js',
	'sass',
	'minify_images'],
	function() {
		// place code for your default task here
	}
);
