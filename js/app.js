var bdApp = angular.module('bdApp',[]);

bdApp.controller('bdController',['$scope','apiService',function($scope,apiService){
    $scope.title = "";
    $scope.box = "";
    $scope.search = function() {
        console.log($scope.title);
        var req = apiService.request($scope.title);
        req.then(function(d){
            $scope.box = apiService.getInfoBox(d);
        },function(d){
            $scope.box = "Error";
        });
    };
    $scope.boxRegex = new RegExp('{{[Ii]nfobox(.|\n)*}}', 'g');
}]);

bdApp.service('apiService',['$http', function($http){
    var boxRegex = new RegExp('{{[Ii]nfobox(.|\n)*}}', 'g');
    this.request = function(title) {
        console.log(title);
        var url = ['https://en.wikipedia.org/w/api.php?',
                'action=query&',
                'prop=revisions&',
                'rvprop=content&',
                'rvsection=0&',
                'format=json&',
                'callback=JSON_CALLBACK&',
                'titles=',title,
                '&redirects'].join('');
        return $http({
            url: url,
            method: 'jsonp'
        });
    };
    this.getInfoBox = function(wikiJson) {
        var wikiContent = wikiJson.data.query.pages[Object.keys(wikiJson.data.query.pages)[0]].revisions[0]['*'];
        var boxSearch = boxRegex.exec(wikiContent,'g');
        return boxSearch[0];
    };
}]);
