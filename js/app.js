var bdApp = angular.module('bdApp',[]);

bdApp.controller('bdController',['$scope','$http',function($scope,$http){
    $scope.title = "";
    $scope.box = "";
    $scope.search = function() {
        console.log("hello");
        var url = ['https://en.wikipedia.org/w/api.php?',
                'action=query&',
                'prop=revisions&',
                'rvprop=content&',
                'rvsection=0&',
                'format=json&',
                'callback=JSON_CALLBACK&',
                'titles=',$scope.title,
                '&redirects'].join('');
        $http({
            url: url,
            method: 'jsonp'
        }).then(function(d){
            console.log(d);
            console.log('SUCCESS');
            var wikiContent = d.data.query.pages[Object.keys(d.data.query.pages)[0]].revisions[0]['*'];
            var stuff = $scope.boxRegex.exec(wikiContent,'g');
            console.log(stuff);
            $scope.box = stuff[0];
        }, function(d){
            console.log('ERROR');
            console.log(d); 
        });
    };
    $scope.boxRegex = new RegExp('{{[Ii]nfobox(.|\n)*}}', 'g');
    $scope.fun = function(){
        console.log("FUN");
    };
    
}]);