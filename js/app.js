var bdApp = angular.module('bdApp',[]);

bdApp.controller('bdController',['$scope','apiService','parseService',function($scope,apiService,parseService){
    $scope.title = "";
    $scope.deathD = "";
    $scope.birthD = "";
    $scope.deathP = "";
    $scope.search = function() {
        //console.log($scope.title);
        var req = apiService.requestPerson($scope.title);
        req.then(function(d){
            var text = apiService.getInfoBox(d);
            //console.log(text);
            var info = parseService.parsePerson(text);
            $scope.deathD = info["Death Date"];
            $scope.birthD = info["Birth Date"];
            $scope.deathP = info["Death Place"];
            $scope.birthP = info["Birth Place"];
        },function(d){
            $scope.box = "Error";
        });
    };
    
}]);

bdApp.service('apiService',['$http', function($http){
    var boxRegex = new RegExp('{{[Ii]nfobox(.|\n)*}}', 'g');
    // Makes the request to the wikimedia api with a given title
    this.requestRefer = function(title) {
        var url = ['https://en.wikipedia.org/w/api.php?',
                'action=query&',
                'prop=revisions&',
                'rvprop=content&',
                'format=json&',
                'callback=JSON_CALLBACK&',
                'titles=',title,
                '&redirects'].join('');
        return $http({
            url: url,
            method: 'jsonp'
        });
    };
    this.requestPerson = function(title) {
        //console.log(title);
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
    // Parses out the infobox of a wikipedia page from its wikimedia api json
    this.getInfoBox = function(wikiJson) {
        var wikiContent = wikiJson.data.query.pages[Object.keys(wikiJson.data.query.pages)[0]].revisions[0]['*'];
        console.log(wikiJson.data.query.pages);
        var boxSearch = boxRegex.exec(wikiContent,'g');
        boxRegex.lastIndex = 0;
        var res =  boxSearch[0];
        return res;
    }
            
}]);
bdApp.service("checkService",function(){
    this.isPerson = function(wikiJson) {
        try{
            var wikiContent = wikiJson.data.query.pages[Object.keys(wikiJson.data.query.pages)[0]].revisions[0]['*'];
            console.log(wikiJson.data.query.pages);
            var boxSearch = new RegExp('{{[Ii]nfobox(.|\n)*}}', 'g').exec(wikiContent,'g');
            boxRegex.lastIndex = 0;
            var res =  boxSearch[0];
            return true;
        }catch(err) {
            return false;
        }
        
    };
    this.isRedirect = function(wikiJson) {
        var wikiContent = wikiJson.data.query.pages[Object.keys(wikiJson.data.query.pages)[0]].revisions[0]['*'];
        var redirectReg = new RegExp('#REDIRECT[ ]*\[\[[A-z]*\]\]', 'g');
        if(redirectReg.exec(wikiContent) != null) {
            return true;
        }
        return false;
    };
    this.isRefer = function(wikiJson) {
        var wikiContent = wikiJson.data.query.pages[Object.keys(wikiJson.data.query.pages)[0]].revisions[0]['*'];
        var referReg = new RegExp('may refer to','g');
        if(referReg.exec(wikiContent) != null) {
            return true;
        }
        return false;
    }
    
});
bdApp.service('parseService',function(){
    this.parsePerson = function(text) {
        // Remove comments
        text = this.replaceAll('<!--.*-->', '', text);
        // Remove all html tags
        text = this.replaceAll('<ref.*(/>|>.*</ref>)', '', text);
        // Remove footnotes 
        text = this.replaceAll('\{\{refn[^\}\}]*?\}\}', '', text);
        var lines = this.processLines(text);
        var ret = this.findDatesPlaces(lines);
        //console.log(lines);
        return ret;
    };
    // We process and format lines from the infobox
    this.processLines = function(text) {
        var res = {};
        var result = {};
        result = text.split("\n");
        //console.log(text.split("\n"));
        //console.log(result);
        var serv = this;
        result.forEach(function(item){
            
            var itemIndex = item.indexOf('=');
            if(itemIndex != -1) {
                var item_name = item.substr(0, itemIndex).trim();
                var item_content = item.substr(itemIndex + 1).trim().split('\n')[0];
                //console.log(item+"-"+item_name+"-"+item_content);
                /*
                * Extract all simple texts inside '[[ ]]'
                * such as [[France]], [[Language French|French]], etc.
                */
                var find = item_content.match(/\[\[.*?\]\]/g);
            
                if (find) {
                    find.forEach(function(substring) {
                        var barestring = substring.replace('[[', '').replace(']]', '');
                        var arr = barestring.split('|');
                        /**
                        * TODO: support link.
                        * Reference: https://en.wikipedia.org/wiki/Help:Wiki_markup#Links_and_URLs
                        */
                        item_content = item_content.replace(substring, arr[arr.length - 1]);
                    });
                }
                while (item_content.indexOf('{{nowrap|') !== -1) {
                    item_content = item_content.replace('{{nowrap|', '');
                    item_content = item_content.replace('}}', '');
                }
                while (item_content.indexOf('{{small|') !== -1) {
                    item_content = item_content.replace('{{small|', '');
                    item_content = item_content.replace('}}', '');
                }
                if (item_content.indexOf('{{native') !== -1) {
                    find = item_content.match(/\{\{native[^\}\}]*?\}\}/g);
                    find && find.forEach(function(substring) {
                        item_content = item_content.replace(substring, substring.split('|')[2]);
                    });
                }
                /* Remove simple vertical list tag */
                if (item_content.indexOf('{{vunblist') !== -1 &&
                    item_content.split('{{').length < 3) {

                    find = item_content.match(/\{\{vunblist[^\}\}]*?\}\}/g);
                    find && find.forEach(function(substring) {
                        var tmp = substring.split('|');
                        tmp.shift();
                        item_content = item_content.replace(substring, tmp.join(',').replace('}}', ''));
                    });
                }
                /* Remove efn tag */
                if (item_content.indexOf('{{efn') !== -1) {
                    find = item_content.match(/\{\{efn[^\}\}]*?\}\}/g);
                    find && find.forEach(function(substring) {
                      item_content = item_content.replace(substring, '');
                    });
                }
                item_content = serv.replaceAll('&nbsp', ' ', item_content);
                item_content = serv.replaceAll('\n\}\}', '', item_content);
                //console.log(item+"-"+item_name+"-"+item_content);
                res[item_name] = item_content;
            }
        });
        return res;
    };
    // Method to replae every instance of find with replace in str
    this.replaceAll = function(find, replace, str) {
        if(str) {
            return str.replace(new RegExp(find, 'gm'), replace).trim();
        } else {
            return null;
        }
    };
    this.findDatesPlaces = function(lines) {
        var result = {};
        for(var key in lines) {
            var birthD = new RegExp(/[Bb]irth_[Dd]ate/,"g");
            var deathD = new RegExp(/[Dd]eath_[Dd]ate/,"g");
            var deathP = new RegExp(/[Dd]eath_[Pp]lace/,"g");
            var birthP = new RegExp(/[Bb]irth_[Pp]lace/,"g");
            if(birthD.exec(key)) {
                //console.log(key);
                result["Birth Date"] = lines[key];
            }
            if(deathD.exec(key)) {
                //console.log(key);
                result["Death Date"] = lines[key];
            }
            if(deathP.exec(key)) {
                //console.log(key);
                result["Death Place"] = lines[key];
            }
            if(birthP.exec(key)) {
                //console.log(key);
                result["Birth Place"] = lines[key];
            }
        }
        return result;
    };
    
}]);
