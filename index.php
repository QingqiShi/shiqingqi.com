<?php
define('__ROOT__', dirname(__FILE__));

require(__ROOT__.'/common/model/index_model.php');
?>
<!DOCTYPE html>
<html lang="en">
  <?php
    require(__ROOT__.'/common/view/header.php');
  ?>
  <body data-spy="scroll">
    <?php
      require(__ROOT__.'/common/view/master_nav_bar.php');
    ?>

    <div class="jumbotron masterHead">
      <div class="container">
        <span class="masterIcon center-block text-center">石</span>
        <h1 class="text-center masterText">Qingqi Shi<br> <small class="text-uppercase">Computer Science Student</small></h1>
      </div>
    </div>

    <div class="hidden-xs" id="sectionIndicator">
      <nav class="navbar navbar-default navbar-static-top" data-spy="affix" data-offset-top="443">
        <div class="container">
          <ul class="nav navbar-nav">
            <li><a href="#works">Works</a></li>
            <li><a href="#experiences">Experiences</a></li>
            <li><a href="#educations">Educations</a></li>
          </ul>
        </div>
      </nav>
    </div>

    <div class="jumbotron contentJumboLight" id="works">
      <div class="container">
        <div class="page-header text-center text-uppercase">
          <h1>My Works</h1>
        </div>

        <h3>Website Designs</h3>
        <div class="row">
          <div class="col-sm-4">
            <div class="thumbnail">
              <a href="//shiqingqi.com/works/cssa_nott_description.php" class="aTag">
                <img
                srcset="//shiqingqi.com/resources/image/Works/cssanott_full_length_768.jpg 768w,
                //shiqingqi.com/resources/image/Works/cssanott_full_length_992.jpg 992w,
                //shiqingqi.com/resources/image/Works/cssanott_full_length_1200.jpg 1200w"
                sizes="100%">
              </a>
              <a href="//shiqingqi.com/works/cssa_nott_description.php" class="btn btn-default detailsBtn">
                <i>Details...</i>
              </a>
            </div>
          </div>
          <div class="col-sm-4">
            <div class="thumbnail">
              <a href="//reddishcoop.wordpress.com" target="_blank" class="aTag">
                <img
                srcset="//shiqingqi.com/resources/image/Works/reddishcoop_full_length_768.jpg 768w,
                //shiqingqi.com/resources/image/Works/reddishcoop_full_length_992.jpg 992w,
                //shiqingqi.com/resources/image/Works/reddishcoop_full_length_1200.jpg 1200w"
                sizes="100%">
              </a>
              <a href="//reddishcoop.wordpress.com" class="btn btn-default detailsBtn">
                <i>Details...</i>
              </a>
            </div>
          </div>
          <!-- <div class="col-sm-4">
            <div class="thumbnail">
              <img data-src="holder.js/100px200">
            </div>
          </div> -->
        </div>

        <h3>Coding Projects</h3>
        <h3><small>Comming soon.</small></h3>
        <!-- <div class="row">
          <div class="col-sm-4">
            <div class="panel panel-default">
              <div class="panel-heading">
                <h3 class="panel-title">Project 1</h3>
              </div>
              <div class="panel-body">
                Project description. Lorem ipsum dolor sit amet, consectetur adipisicing elit. Iste enim quas eligendi maxime consectetur. Rem voluptas, debitis, quaerat cupiditate aut quia dolores, doloribus modi aperiam voluptatum, quas eveniet cum. Nisi.
              </div>
            </div>
          </div>
          <div class="col-sm-4">
            <div class="panel panel-default">
              <div class="panel-heading">
                <h3 class="panel-title">Project 2</h3>
              </div>
              <div class="panel-body">
                Project description. Lorem ipsum dolor sit amet, consectetur adipisicing elit. Consectetur placeat quidem cupiditate blanditiis facere aspernatur exercitationem, fugit quibusdam voluptatibus, tempora earum voluptas ducimus atque, facilis quod, rerum cumque! Quibusdam, quis.
              </div>
            </div>
          </div>
          <div class="col-sm-4">
            <div class="panel panel-default">
              <div class="panel-heading">
                <h3 class="panel-title">Project 3</h3>
              </div>
              <div class="panel-body">
                Project description. Lorem ipsum dolor sit amet, consectetur adipisicing elit. Asperiores, incidunt repudiandae, recusandae at debitis numquam, accusantium rem quas ipsa, quasi aut ducimus. Optio a quod, nihil sapiente accusamus quia ratione!
              </div>
            </div>
          </div>
        </div> -->
      </div>
    </div>

    <div class="jumbotron contentJumboDark" id="experiences">
      <div class="container">
        <div class="page-header text-center text-uppercase">
          <h1>My Experiences</h1>
        </div>

        <div class="container-fluid text-left">
          <h3>Lead Developer <br>
            <small>2014 - Group Project, Nottingham</small></h3>
          <p>I was the leading developer of a group of 7 people. We produced a cross platform game as a team with the aim to aid children in learning mathematics. The tools we used was Unity and C#, both of these were new to me. I gained valuable teamwork experience and improved my self learning abilities.</p>

          <h3>CSSA IT Officer <br>
            <small>2013 - CSSA Nott, Nottingham</small></h3>
          <p>I was elected to be the IT Officer of the Chinese Students and Scholars Association (CSSA). My main job was to maintain its online forum as well as developing a new homepage for it. I also participated in the planning and management of events such as the local Chinese New Year Gala.</p>

          <h3>Video Commentator <br>
            <small>2013 - Youku and Youtube, Nottingham</small></h3>
          <p>I used my spare time to create video game commentary screencasts. By posting them on the internet, I gained more than 40,000 subscribers and I was able to earn a part of my living fees from advertising revenue.</p>


          <h3>Waiter <br>
            <small>2011 - Jinwan Restaurant, Manchester</small></h3>
          <p>This is my first part time job. I gained valuable experience on how to work with other people, and had the chance to speak with all kinds of customers, which greatly increased my social skills.</p>

        </div>
      </div>
    </div>

    <div class="jumbotron contentJumboLight" id="educations">
      <div class="container">
        <div class="page-header text-center text-uppercase">
          <h1>My Educations</h1>
        </div>

        <div class="container-fluid text-left">
          <div class="row">
            <div class="col-sm-3 text-center logoContainer">
              <img data-src="holder.js/100px157" src="//shiqingqi.com/resources/image/Educations/University_of_Nottingham.svg" class="img-responsive thumbnail center-block logo">

            </div>
            <div class="col-sm-9">
              <h3>The University of Nottingham - Computer Science <br>
                <small>2013 - present</small></h3>
              <p>Just finished the second year of my bachelor degree of Computer Science, achieving first class results with an average mark of 84.</p>
            </div>
          </div>
          <div class="row">
            <div class="col-sm-3 text-center logoContainer">
              <img data-src="holder.js/100px157" src="//shiqingqi.com/resources/image/Educations/AGSB.png" class="img-responsive thumbnail center-block logo">
            </div>
            <div class="col-sm-9">
              <h3>Altrincham Grammar School for Boys Sixth Form <br>
                <small>2011 - 2013</small></h3>
              <p>Studied Computing, Mathematics, Further Mathematics, Physics, Chemistry and Chinese at AS and A2 Level, achieving final A Level grades of A*AA.</p>
            </div>
          </div>

        </div>
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
