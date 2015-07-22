<?php
define('__ROOT__', dirname(dirname(__FILE__)));

require(__ROOT__.'/works/model/cssa_nott_description_model.php');
?>
<!DOCTYPE html>
<html  lang="en">
  <?php
    require(__ROOT__.'/common/view/header.php');
  ?>
  <body>
    <?php
      require(__ROOT__.'/common/view/master_nav_bar.php');
    ?>

    <div class="jumbotron websiteDetailsJumbo">
      <div class="container">
        <div class="row">
          <div class="col-sm-6 titleContainer">
            <h1>
              <small class="text-uppercase">
                <i>Website for</i>
              </small>
              <br>
              CSSA Nottingham
            </h1>
          </div>
          <div class="col-sm-6 noPaddingAtExSm">
            <div class="imgContainer">
              <img class="monitor" src="//shiqingqi.com/resources/image/SVG/Monitor.svg" alt="" />
              <div class="websiteContainer">
                <img class="website"
                srcset="//shiqingqi.com/resources/image/Works/cssanott_full_length_768.jpg 768w,
                //shiqingqi.com/resources/image/Works/cssanott_full_length_992.jpg 992w,
                //shiqingqi.com/resources/image/Works/cssanott_full_length_1200.jpg 1200w"
                sizes="0%">
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div id="websiteDescription"  class="container">
      <div class="description text-justify">
        <p>
          When I joined the Chinese Students and Scholars Association(CSSA) back in 2014, during my first year of university, I noticed that CSSA Nottingham's website didn't have of a proper homepage. This is why when you enter the URL as below:
        </p>
        <blockquote>
          <i>www.cssanott.co.uk</i>
        </blockquote>
        <p>
          You would get redirected to its forum:
        </p>
        <blockquote>
          <i>www.cssanott.co.uk/bbs</i>
        </blockquote>
        <p>
          This is why I offered my help in creating a proper homepage for CSSA Nottingham. It is still live so feel free to check it out.
        </p>
        <div class="text-center">
          <p>
            <a class="btn btn-primary" href="//www.cssanott.co.uk" rel="nofollow" target="_blank">CSSA Nottingham</a>
          </p>
        </div>

        <h2 class="text-left">Before This Project</h2>
        <p>
          To be honest, my knowledge in web development was quite basic back then. I knew HTML and CSS quite well, although that basically means I know how to Google any information I need. I had very limited experience with Javascript and PHP, and I relied on my basic programming knowledge to help me learn these quickly.
        </p>
        <p>
          I was an absolute beginner in using version control systems, and I had no idea what was package management, dependency management, CSS pre-processors and automated task runners.
        </p>
        <p>
          Regardless of my lack of professional knowledge, I started my work on this project.
        </p>

        <h2 class="text-left">Details</h2>
        <p>
          This is the first time I had a chance to play with CSS pre-processors. I learnt the basics of SASS and used it to improve my workflow in creating CSS.
        </p>
        <p>
          I focused on responsive design and made the website respond to different screen widths. I wasn't very experienced with responsive designs and had to do a lot of research to get everything correct - responsive images, grid system, media queries and more.
        </p>
        <div class="text-center">
          <img src="//shiqingqi.com/resources/image/Works/cssanott/cssanott_responsivedesign.jpg" />
        </div>
        <p>
          JQuery was rather easy to learn as it is very declaritive - the work flow is basically select, function, result. I used JQuery to create a simple slide show on the new homepage to loop through four images.
        </p>
        <div class="text-center">
          <img src="//shiqingqi.com/resources/image/Works/cssanott/cssanott_imageslider.jpg" class="shadowImage" />
        </div>
        <p>
          CSSA Nottingham is an organisation based in UK Nottingham for Chinese students. Therefore its website are viewed by Chinese speakers as well as English speakers. Thats why I wanted to create the website in both Chinese and English.
        </p>
        <p>
          I created a system using PHP to load either the English or Chinese version of any text on the page based on the URL. If the URL doesn't specify a language, the website would look at the user's browser language preferences and choose the most suitable language to display. Users are also presented with a button on the top right of the page to toggle between the two languages.
        </p>
        <div class="text-center">
          <img src="//shiqingqi.com/resources/image/Works/cssanott/cssanott_multilanguage.jpg" />
        </div>
        <p>
          Finally, the entire project is version controlled on a private Github repository. I wouldn't say I've mastered version control though, there are much more to version control than just 'taking a snap shot so I can revert if I mess up'.
        </p>
        <div class="text-center">
          <img src="//shiqingqi.com/resources/image/Works/cssanott/cssanott_githubrepo.jpg" class="shadowImage" />
        </div>

        <h2 class="text-left">Conclusion</h2>
        <p>
          This project is by no means a professional piece work, but I have definally improved my limited skills. These skills couldn't be leant in schools, and therefore are very valuable to me.
        </p>
      </div>
    </div>

    <?php
      require(__ROOT__.'/common/view/footer.php');
    ?>

    <?php
      require(__ROOT__.'/common/view/js_libraries.php');
    ?>
  </body>
</html>
