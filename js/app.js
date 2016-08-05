var bdApp = angular.module('bdApp',['ngMap']);

bdApp.controller('bdController',['$scope','apiService','checkService','parseService','NgMap',function($scope,apiService,checkService,parseService,NgMap){
    
    $scope.log = function(message) {
        console.log(message);
    };
    $scope.birthPlace = function() {
        console.log($scope.birthP);
        return $scope.birthP;
    }
    $scope.deathPlace = function() {
        console.log($scope.deathP);
        return $scope.deathP;
    }
    $scope.googleMapsUrl="https://maps.googleapis.com/maps/api/js?key=AIzaSyATLVXUzJhvTD-xV96EpM1B4bBnWYGhEPI";
    // A variable to track which state we are currently in
    // phase[0] - a person's info
    // phase[1] - a 'may refer to' list
    $scope.phase=[false,false];
    // Variables that hold all the person's relevant info
    $scope.title = "";
    $scope.deathD = "";
    $scope.birthD = "";
    $scope.deathP = "";
    $scope.age = "";
    $scope.search = function(title) {
        try{
        //console.log($scope.title);
        // Make an initial request
        var req = apiService.requestPerson(title);
        req.then(function(d){
            // If the request returns a person we begin parsing the infobox out and all their info
            if (checkService.isPerson(d)){
                $scope.box = "";
                
                var text = apiService.getInfoBox(d);
                // Parse out the information needed from a person's article page
                var info = parseService.parsePerson(text);
                // We assign the info to be displayed in the info template
                $scope.deathD = info["Death Date"];
                $scope.birthD = info["Birth Date"];
                $scope.deathP = info["Death Place"];
                $scope.birthP = info["Birth Place"];
                // Then we finally show the the info.html template
                if($scope.deathD == null || $scope.deathP == null) {
                    $scope.box = "That person is alive :D (or not important enough for Wikipedia to list them :()";
                } else {
                    birthDate = parseService.formatDate(info["Birth Date"]);
                    deathDate = parseService.formatDate(info["Death Date"]);
                    $scope.deathD = deathDate.hasOwnProperty("invalid") ? "Wikipedia doesn't have the info" : deathDate.prettyForm;
                    $scope.birthD = birthDate.hasOwnProperty("invalid") ? "Wikipedia doesn't have the info" : birthDate.prettyForm;
                    $scope.age = deathDate.hasOwnProperty("invalid") || birthDate.hasOwnProperty("invalid") ? "Wikipedia did not supply correct info to find age" : parseService.formateAge(deathDate.dateNum,birthDate.dateNum);
                    
                    $scope.phase = [true,false];
                    console.log(NgMap.initMap());
                    
                }
                
            // If it's a page that has disambiguation then we serve the list template
            } else if(checkService.isRefer(d)){
                $scope.box = "";
                $scope.phase = [false,true];
                apiService.requestRefer(title).then(function(d){
                    $scope.list = parseService.parseRefer(d);
                });
            } else {
                //$scope.phase=[false,false];
                $scope.box = "Not a valid article";
            }
            
        },function(d){
            $scope.phase = [false,false];
            $scope.box = "Error";
        });
        } catch (error) {
            $scope.box = "Not a valid article";
        }
    };
    
}]);
// This a service to facilitate varying requests 
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
        
        var boxSearch = boxRegex.exec(wikiContent,'g');
        boxRegex.lastIndex = 0;
        var res =  boxSearch[0];
        return res;
    }
            
}]);
// This is a service to check what type of article was retrieved from a request
bdApp.service("checkService",function(){
    this.isPerson = function(wikiJson) {
        try{
            var wikiContent = wikiJson.data.query.pages[Object.keys(wikiJson.data.query.pages)[0]].revisions[0]['*'];
            
            var boxSearch = new RegExp('{{[Ii]nfobox(.|\n)*}}', 'g').exec(wikiContent,'g');
            
            
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
    };
});
// This service is to take in wikipedia text and then return relevant info
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
        return ret;
    };
    this.parseRefer = function(text) {
        var listReg = new RegExp(/\[\[[A-z ,0-9\"\.\-\(\)']*\]\]/,'g');
        var listRegex = new RegExp(/\*\[\[[A-z ,0-9\"\.\-\(\)']*\]\][A-z \(\),0-9\–'\-\?\.\|/"]*/,'g');
        var wikiContent = text.data.query.pages[Object.keys(text.data.query.pages)[0]].revisions[0]['*'];
        
        var entry = listRegex.exec(wikiContent,'g');
        
        var lis = [];
        var seachTerms = [];
        while(entry != null) {
            // Make a current object to hold the new values.
            var curr = {};
            var currTerm = listReg.exec(entry[0],'g');
            
            curr.term = this.replaceAll(/[\[\]]/,'',currTerm[0]);
            listReg.lastIndex = 0;
            
            curr.full = this.replaceAll(/[\[\]\*]/,'',entry[0]);
            lis.push(curr);
            
            entry = listRegex.exec(wikiContent,'g');
            
            
        }
        
        listRegex.lastIndex = 0;
        
        return lis;
    }
    // We process and format lines from the infobox
    this.processLines = function(text) {
        var res = {};
        var result = {};
        result = text.split("\n");
        var serv = this;
        result.forEach(function(item){
            
            var itemIndex = item.indexOf('=');
            if(itemIndex != -1) {
                var item_name = item.substr(0, itemIndex).trim();
                var item_content = item.substr(itemIndex + 1).trim().split('\n')[0];
                
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
    // Method to replace every instance of find with replace in str
    this.replaceAll = function(find, replace, str) {
        if(str) {
            return str.replace(new RegExp(find, 'gm'), replace).trim();
        } else {
            return null;
        }
    };
    // This takes in the processed lines and then find the relevant lines 
    this.findDatesPlaces = function(lines) {
        var result = {};
        for(var key in lines) {
            // Here are the regexs used in order to find out if we got a line we care about
            var birthD = new RegExp(/[Bb]irth_[Dd]ate/,"g");
            var deathD = new RegExp(/[Dd]eath_[Dd]ate/,"g");
            var deathP = new RegExp(/[Dd]eath_[Pp]lace/,"g");
            var birthP = new RegExp(/[Bb]irth_[Pp]lace/,"g");
            if(birthD.exec(key)) {
                result["Birth Date"] = lines[key];
            }
            if(deathD.exec(key)) {
                
                result["Death Date"] = lines[key];
            }
            if(deathP.exec(key)) {
                result["Death Place"] = lines[key];
            }
            if(birthP.exec(key)) {
                result["Birth Place"] = lines[key];
            }
        }
        return result;
    };
    // Take the wikipedia date string and then translate that into a usable format in an object with several key value pairs
    this.formatDate = function(dateString) {
        var result = {};
        var months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
        var numReg = /[0-9]+/g;
        var matchArray = dateString.match(numReg);
        var year = parseInt(matchArray[0],10);
        var month = parseInt(matchArray[1],10);
        var day = parseInt(matchArray[2],10);
        if(!angular.isNumber(day) || !angular.isNumber(month) || !angular.isNumber(year) || day > 31 || year < 0 || day <= 0 || month > 12 || month <= 0){
            result["invalid"] = true;
        }
        result["dateNum"] = {"year":year,"month":month,"day":day};
        var prettyDate = months[month-1] +" "+day+", "+year;
        result["prettyForm"] = prettyDate;
        return result;
    };
    this.formateAge = function(deathDateObject,birthDateObject) {
        var result = deathDateObject.year - birthDateObject.year;
        var monthTest = deathDateObject.month < birthDateObject.month;
        var dayTest = (deathDateObject.month==birthDateObject.month) && deathDateObject.day < birthDateObject.day;
        result = monthTest || dayTest ? result - 1 : result;
        return result;
    };
});




