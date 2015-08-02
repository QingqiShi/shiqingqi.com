<?php
define('__ROOT__', dirname(dirname(__FILE__)));

require(__ROOT__.'/works/model/reddish_coop_description_model.php');
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
    <?php
      require(__ROOT__.'/works/view/website_jumbo.php');
    ?>

    <div id="websiteDescription"  class="container">
      <div class="description text-justify">
        <p>
          The final version of this website is no longer available. The only thing left I can find is the first testing site, it's hosted on WordPress so it survived until now.
        </p>
        <div class="text-center">
          <p>
            <a class="btn btn-primary" href="//reddishcoop.wordpress.com" rel="nofollow" target="_blank">Reddish Creative Co-operative</a>
          </p>
        </div>

        <h2 class="text-left">About This Project</h2>
        <p>
          I was a year 10 student (2009) in a secondary school called Reddish Vale Technology College, this school became one of the first schools in the UK to operate as a Co-operative Trust organisation. I was assigned this project to create a website for my school. This was the first project I ever did.
        </p>
        <p>
          Of course I was an absolute beginner back in the days, I barely knew anything about web development. This project does benefit me greatly, though, as I worked with three of my fellow classmates, and this formed my very first team work experience.
        </p>
        <p>
          At first we used Wordpress - it's free and easy to set-up. We messed with the CSS stylesheets and tinkered with some templates. That's the website you see above.
        </p>
        <p>
          Later on we got provided with a server and a domain name. We perfected the CSS styles and recreated the banner image - it was much better than what you see above. Unfortunately, this website is no longer available after we left Reddish Vale.
        </p>
        <p>
          Although this website doesn't look modern anymore, the days I spent with my friends creating this website will forever be one of my most unforgettable memories.
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
