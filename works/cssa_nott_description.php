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
            <h1><small class="text-uppercase">Website for</small><br> CSSA Nottingham</h1>
          </div>
          <div class="col-sm-6">
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
      <div class="description">
        <p>
          Description comming soon.
        </p>
        <!-- <p>
          For a very long time, CSSA NOTT's website does not consist of a proper homepage. This is why when you enter the URL as below:
        </p>
        <p>
          <code>www.cssanott.co.uk</code>
        </p>
        <p>
          The website would take you straight to the forum, which means it would jump to the following URL:
        </p>
        <p>
          <code>www.cssanott.co.uk/bbs</code>
        </p>
        <p>
          Now for the first time, we have an actual home page for our website!
        </p>
        <img class="img-responsive" src="//www.cssanott.co.uk/common/images/homefeed/article_id105_fullscreen.jpg" alt="" />
        <h1>Slide Show</h1>
        <p>
          When you open up the home page, the first thing you'll see is the huge image slide show. So what do you think? Does it look quite professional? ;-)
        </p>
        <img class="img-responsive" src="http://www.cssanott.co.uk/common/images/homefeed/article_id105_imageslider.jpg" alt="" />
        <p>
          You might ask "where does the pictures in the slide show come from"? Well, there are actually a few sources for these images. Perhaps from some intresting forum post; perhaps it's a photograph taken by one of our committee members; Or, it could be a photograph taken by YOU! Just email our IT department: qingqishi@live.com to submit your photograph.
        </p> -->
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
