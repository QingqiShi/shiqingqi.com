<template>
    <div class="timeline">
        <flat-section dark>
            <t t="timeline" tag="h1" />
            <timeline-container>
                <timeline-section :year="2018">
                    <timeline-item s-row-2 l-row-1 l-col-2 media>
                        <t t="watford" tag="div" class="loc heading-font" />
                        <t t="timeline2018Title_PersonalWebsite" tag="h2" />
                        <t t="timeline2018Description_PersonalWebsite" tag="p" />
                        <img slot="media" :src="require('@/assets/shiqingqiNewVersion.jpg')" alt="Thumbnail of the new ShiQingqi.com">
                        <icon-button slot="action" 
                                     :svg="true" 
                                     aria-label="Github link for ShiQingqi.com v1.0"
                                     link="https://github.com/QingqiShi/shiqingqi.com/tree/v1.0.0"
                                     target="blank">
                            <github-svg/>
                        </icon-button>
                    </timeline-item>
                    <timeline-item dark icon="airplanemode_active">
                        <t t="china" tag="div" class="loc heading-font" />
                        <t t="timeline2018Title_Visa" tag="h2" />
                        <t t="timeline2018Description_Visa" tag="p" />
                    </timeline-item>
                </timeline-section>

                <timeline-section :year="2017">
                    <timeline-item dark icon="work">
                        <t t="watford" tag="div" class="loc heading-font" />
                        <t t="timeline2017Title_Job" tag="h2" />
                        <t t="timeline2017Description_Job" tag="p" />
                    </timeline-item>
                    <timeline-item s-row-2>
                        <t t="bristol" tag="div" class="loc heading-font" />
                        <t t="timeline2017Title_MasterProject" tag="h2" />
                        <t t="timeline2017Description_MasterProject" tag="p" />
                    </timeline-item>
                    <timeline-item s-row-2>
                        <t t="bristol" tag="div" class="loc heading-font" />
                        <t t="timeline2017Title_Robotics" tag="h2" />
                        <t t="timeline2017Description_Robotics" tag="p" />
                    </timeline-item>
                    <timeline-item s-row-2 l-row-2>
                        <t t="bristol" tag="div" class="loc heading-font" />
                        <t t="timeline2017Title_PersonalWebsite" tag="h2" />
                        <t t="timeline2017Description_PersonalWebsite" tag="p" />
                        <icon-button slot="action" 
                                     :svg="true" 
                                     aria-label="Github link for ShiQingqi.com v0.2"
                                     link="https://github.com/QingqiShi/shiqingqi.com/tree/81f233744b8e6dabff1b124645c49b6d927d536e"
                                     target="blank">
                            <github-svg/>
                        </icon-button>
                    </timeline-item>
                    <timeline-item dark icon="favorite">
                        <t t="bristol" tag="div" class="loc heading-font" />
                        <t t="timeline2017Title_Married" tag="h2" />
                        <t t="timeline2017Description_Married" tag="p" />
                    </timeline-item>
                    <timeline-item media s-col-2>
                        <t t="bristol" tag="div" class="loc heading-font" />
                        <t t="timeline2017Title_Animation" tag="h2" />
                        <t t="timeline2017Description_Animation" tag="p" />
                        <iframe slot="media" 
                                class="media" 
                                width="560" 
                                height="315" 
                                src="https://www.youtube.com/embed/--0zwWfkACc?rel=0&amp;showinfo=0&amp;start=70"
                                frameborder="0" 
                                allow="autoplay; encrypted-media" 
                                allowfullscreen/>
                    </timeline-item>
                    <timeline-item media s-col-2>
                        <t t="bristol" tag="div" class="loc heading-font" />
                        <t t="timeline2017Title_Graphics" tag="h2" />
                        <t t="timeline2017Description_Graphics" tag="p" />
                        <img slot="media" :src="require('@/assets/ray_tracer_render.png')" alt="Ray Tracer Demo">
                        <icon-button slot="action" 
                                     :svg="true" 
                                     aria-label="Github link for Ray Tracer" 
                                     link="https://github.com/QingqiShi/Ray-Tracer"
                                     target="blank">
                            <github-svg/>
                        </icon-button>
                    </timeline-item>
                    <timeline-item s-row-2 l-col-4 l-row-1>
                        <t t="bristol" tag="div" class="loc heading-font" />
                        <t t="timeline2017Title_Web" tag="h2" />
                        <t t="timeline2017Description_Web" tag="p" />
                        <icon-button slot="action" 
                                     :svg="true" 
                                     aria-label="Github link for Game of Life website"
                                     link="https://github.com/QingqiShi/Game-of-Life-Website"
                                     target="blank">
                            <github-svg/>
                        </icon-button>
                    </timeline-item>
                </timeline-section>

                <timeline-section :year="2016">
                    <timeline-item>
                        <t t="nottingham" tag="div" class="loc heading-font" />
                        <t t="timeline2016Title_IndividualProject" tag="h2" />
                        <t t="timeline2016Description_IndividualProject" tag="p" />
                    </timeline-item>
                </timeline-section>

                <timeline-section :year="2015">
                    <timeline-item>
                        <t t="nottingham" tag="div" class="loc heading-font" />
                        <t t="timeline2015Title_PersonalWebsite" tag="h2" />
                        <t t="timeline2015Description_PersonalWebsite" tag="p" />
                        <icon-button slot="action" 
                                     :svg="true" 
                                     aria-label="Github link for shiqingqi.com"
                                     link="https://github.com/QingqiShi/shiqingqi.com/tree/d46136f5b1adaffdcf22e93c90a387a66ca0b7c5" 
                                     target="blank">
                            <github-svg/>
                        </icon-button>
                    </timeline-item>
                    <timeline-item>
                        <t t="nottingham" tag="div" class="loc heading-font" />
                        <t t="timeline2015Title_GroupProject" tag="h2" />
                        <t t="timeline2015Description_GroupProject" tag="p" />
                    </timeline-item>
                </timeline-section>

                <timeline-section :year="2014">
                    <timeline-item>
                        <t t="nottingham" tag="div" class="loc heading-font" />
                        <t t="timeline2014Title_CSSA" tag="h2" />
                        <t t="timeline2014Description_CSSA" tag="p" />
                    </timeline-item>
                </timeline-section>
                
                <timeline-section :year="2013">
                    <timeline-item s-row-2 l-row-1 l-col-2>
                        <t t="nottingham" tag="div" class="loc heading-font" />
                        <t t="timeline2013Title_Youtube" tag="h2" />
                        <t t="timeline2013Description_Youtube" tag="p" />
                    </timeline-item>
                    <timeline-item dark icon="bookmark">
                        <t t="nottingham" tag="div" class="loc heading-font" />
                        <t t="timeline2013Title_Uni" tag="h2" />
                        <t t="timeline2013Description_Uni" tag="p" />
                    </timeline-item>
                </timeline-section>

                <timeline-section :year="2011">
                    <timeline-item>
                        <t t="manchester" tag="div" class="loc heading-font" />
                        <t t="timeline2011Title_Waiter" tag="h2" />
                        <t t="timeline2011Description_Waiter" tag="p" />
                    </timeline-item>
                </timeline-section>

                <timeline-section :year="2009">
                    <timeline-item>
                        <t t="manchester" tag="div" class="loc heading-font" />
                        <t t="timeline2009Title_SchoolWebsite" tag="h2" />
                        <t t="timeline2009Description_SchoolWebsite" tag="p" />
                    </timeline-item>
                </timeline-section>
            </timeline-container>
        </flat-section>
        <white-footer/>
    </div>
</template>

<script>
// @ is an alias to /src
import FlatSection from '@/components/FlatSection.vue';
import TimelineContainer from '@/components/TimelineContainer.vue';
import TimelineSection from '@/components/TimelineSection.vue';
import TimelineItem from '@/components/TimelineItem.vue';

import Card from '@/components/Card.vue';
import WhiteFooter from '@/components/WhiteFooter.vue';
import IconButton from '@/components/IconButton.vue';
import GithubSvg from '@/components/GithubSvg.vue';

export default {
    name: 'Home',
    components: {
        FlatSection,
        TimelineContainer,
        TimelineSection,
        TimelineItem,

        Card,
        WhiteFooter,
        IconButton,
        GithubSvg
    }
};
</script>

<style lang="scss">
@import '../scssUtils/colors';
@import '../scssUtils/breakpoint';

h1 {
    text-transform: uppercase;
}

h2 {
    margin-top: 0;
}

.loc {
    text-transform: uppercase;
    font-size: 0.9rem;
}
</style>
