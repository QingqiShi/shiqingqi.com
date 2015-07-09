var gulp = require('gulp');
var usemin = require('gulp-usemin');
var uglify = require('gulp-uglify');
var minifyCss = require('gulp-minify-css');
var imagemin = require('gulp-imagemin');

gulp.task('libraries', function() {
	return gulp.src('bower_components/*/dist/**/*')
	.pipe(gulp.dest('resources/'));
});

gulp.task('uglify_js', function() {
	return gulp.src('resources_src/js/*.js')
	.pipe(uglify())
	.pipe(gulp.dest('resources/js/'));
});

gulp.task('minify_css', function() {
	return gulp.src('resources_src/css/*.css')
	.pipe(minifyCss())
	.pipe(gulp.dest('resources/css/'));
});

gulp.task('minify_images', function() {
	return gulp.src('resourcecs_src/image/*')
	.pipe(imagemin())
	.pipe(gulp.dest('resourcces/image/'));
})

gulp.task('watch', function() {
	return gulp.watch(['resourcecs_src/css/*', 'resources_src/js/*', 'resources_src/image/*'], ['default']);
});

gulp.task('default', 
	['libraries', 
	'uglify_js', 
	'minify_css', 
	'minify_images'], 
	function() {
		// place code for your default task here
	}
);