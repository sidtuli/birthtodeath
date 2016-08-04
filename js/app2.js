var testApp = angular.module('testApp',['uiGmapgoogle-maps']);

testApp.controller('testCtrlr',['$scope',function($scope){
    
}]);

testApp.config(function(uiGmapGoogleMapApiProvider) {
    uiGmapGoogleMapApiProvider.configure({
        key: 'AIzaSyATLVXUzJhvTD-xV96EpM1B4bBnWYGhEPI',
        v: '3.20', //defaults to latest 3.X anyhow
        libraries: 'weather,geometry,visualization'
    });
})