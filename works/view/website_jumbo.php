<?php

// Require following strings:
//    $websiteTitle
//    $websiteSmImageUrl
//    $websiteMdImageUrl
//    $websiteLgImageUrl

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
          <?php echo $websiteTitle; ?>
        </h1>
      </div>
      <div class="col-sm-6">
        <div class="imgContainer">
          <img class="monitor" src="//cdn.shiqingqi.com/resources/image/SVG/Monitor.svg" alt="" />
          <div class="websiteContainer">
            <img class="website"
            srcset="<?php echo $websiteSmImageUrl; ?> 768w,
            <?php echo $websiteMdImageUrl; ?> 992w,
            <?php echo $websiteLgImageUrl; ?> 1200w"
            sizes="0%">
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
