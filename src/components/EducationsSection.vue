<template functional>
    <flat-section :dark="true" :flex="true">
        <education :options="{
            logo: require('@/assets/University_of_Bristol.svg'),
            time: 'eduBristolTime',
            type: 'eduBristolType',
            school: 'eduBristolSchool',
            course: 'eduBristolCourse',
            detail: [
                {
                    name: 'eduBristolDetailName1',
                    value: 'eduBristolDetailValue1'
                },
                {
                    name: 'eduBristolDetailName2',
                    value: 'eduBristolDetailValue2'
                },
                {
                    name: 'eduBristolDetailName3',
                    value: 'eduBristolDetailValue3'
                }
            ]
        }" />
        <education :options="{
            logo: require('@/assets/University_of_Nottingham.svg'),
            time: 'eduNottinghamTime',
            type: 'eduNottinghamType',
            school: 'eduNottinghamSchool',
            course: 'eduNottinghamCourse',
            detail: [
                {
                    name: 'eduNottinghamDetailName1',
                    value: 'eduNottinghamDetailValue1'
                },
                {
                    name: 'eduNottinghamDetailName2',
                    value: 'eduNottinghamDetailValue2'
                },
                {
                    name: 'eduNottinghamDetailName3',
                    value: 'eduNottinghamDetailValue3'
                }
            ]
        }" />
        <education :options="{
            logo: require('@/assets/AGSB.png'),
            time: 'eduAGSBTime',
            type: 'eduAGSBType',
            school: 'eduAGSBSchool',
            course: 'eduAGSBCourse',
            detail: [
                {
                    name: 'eduAGSBDetailName1',
                    value: 'eduAGSBDetailValue1'
                }
            ]
        }" />
    </flat-section>
</template>
