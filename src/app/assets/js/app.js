var el = x => document.getElementById(x);


Element.prototype.documentOffsetTop = function () {
    return this.offsetTop + ( this.offsetParent ? this.offsetParent.documentOffsetTop() : 0 );
};

var ToTitleCase = function(input)
{
    str = input.toLowerCase().split('-');
    for (var i = 0; i < str.length; i++) {
        str[i] = str[i].charAt(0).toUpperCase() + str[i].slice(1); 
    }
    
    return str.join(' ');
}

var app = new Vue({
    el: '#app',
    data: function () {
        return {
            results: [],
            images: [],
            dogBreeds: [],
            catBreeds: [],
            state: "ready"
        }
        
    },
    computed : 
    {
        addImagesVisible: function()
        {
            return this.images.length < 9 && this.results.length == 0
        },

        buttonVisible: function()
        {
            if (this.state == "none") return false;
            return this.images.length > 0 || this.results.length > 0
        },

        buttonValue: function()
        {
            if(this.state == "done") return "Start Over"
            else if(this.state == "pending") return "Analyzing..."
            else if(this.state == "ready") return "Analyze"
        },

        buttonEnabled: function()
        {
            if(this.state == "pending") return false;
        },
        rankings: function() 
        { 
            return this.catBreeds.concat(this.dogBreeds)
        }
    },
    mounted : function() 
    {
        window.scrollTo(0,0);

        axios.get('assets/data/cat-rankings-source.json')
        .then(response => this.catBreeds = response.data)

        axios.get('assets/data/dog-rankings-source.json')
        .then(response => this.dogBreeds = response.data)

    },
    methods: {
        ToTitleCase: function(input)
        {
            str = input.toLowerCase().split('-');
            for (var i = 0; i < str.length; i++) {
                str[i] = str[i].charAt(0).toUpperCase() + str[i].slice(1); 
            }
            
            return str.join(' ');
        },
        gradient: function(percent) 
        {
            return `linear-gradient(to right, #ff4d4d ${percent}%, transparent 0%)`
        },
        reset: function() 
        {
            this.state = "none"

            window.scrollTo(0,1);
            window.scrollTo(0,0);
            var isScrolling;
            var that = this;

            var handleScroll = function(event) 
            {
                window.clearTimeout(isScrolling);
                isScrolling = setTimeout(() =>
                {
                    Vue.nextTick(() => 
                    {
                        el("file-input").value = null
                        that.results = []
                        that.images = []
                        that.state = "ready"
                        window.removeEventListener('scroll', handleScroll);
                    })
                }, 100);
            }

            window.addEventListener('scroll', handleScroll, false);
        },
        
        buttonClick: function()
        {
            if (this.state == "ready")
                this.submit()
            else if (this.state == "done") 
                this.reset()
        },

        submit: function () 
        {
            this.state = "pending"
            document.getElementById("button").blur();

            imageData = []
            this.images.forEach(i => {
                var canvas = document.getElementById(i.name);
                var url = canvas.toDataURL('image/jpg');
                imageData.push(url)
            })

            axios.post('/analyze', imageData)
                .then(response => 
                {
                    this.results = []
                    response.data.forEach(d => 
                        {
                            d[2] = this.rankings.find(x => x.name == d[0]).link
                            d[0] = ToTitleCase(d[0])
                            this.results.push(d)
                        });

                    Vue.nextTick(() => 
                    {
                        var top = document.getElementById("results").documentOffsetTop();
                        window.scrollTo(0, top);
                        this.state = "done"
                    })
                })
        },

        showPicker: function () {
            el("file-input").click();
        },

        imagesSelected: function (input) 
        {
            //convert to array
            selectedImages = Array.from(el("file-input").files)

            //filter already uploaded duplicates
            newImages = []
            selectedImages.forEach(image => {
                if (!this.images.some(i => i.name == image.name)) {
                    newImages.push(image)
                }
            })

            //cap max 
            newImages = newImages.slice(0, 9 - this.images.length)
            this.images = this.images.concat(newImages)

            Vue.nextTick(() => {
                newImages.forEach(file => {
                    var canvas = document.getElementById(file.name);
                    var ctx = canvas.getContext("2d");

                    var reader = new FileReader();

                    reader.onload = function (event) {
                        var img = new Image();

                        img.onload = function () {
                            // get the scale
                            var scale = Math.max(canvas.width / img.width, canvas.height / img.height);

                            // get the top left position of the image
                            var x = (canvas.width / 2) - (img.width / 2) * scale;
                            var y = (canvas.height / 2) - (img.height / 2) * scale;

                            var angle = 0
                            var exif = EXIF.getData(img, () => {
                                switch (img.exifdata.Orientation) {
                                    case 8:
                                        angle = -90 * Math.PI / 180
                                        break;
                                    case 3:
                                        angle = 180 * Math.PI / 180
                                        break;
                                    case 6:
                                        angle = 90 * Math.PI / 180
                                        break;
                                }
                            })

                            ctx.translate(canvas.width / 2, canvas.height / 2);
                            ctx.rotate(angle);
                            ctx.translate(-canvas.width / 2, -canvas.height / 2);
                            ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
                        }

                        img.src = event.target.result;
                    }

                    reader.readAsDataURL(file);
                })

                //scroll to image adder commented out, leaving for later
                //var top = document.getElementById("addImages").documentOffsetTop();
                //window.scrollTo(0, top);
                //var e = document.getElementById("addImages");
                //var y = e.scrollTop;
                //window.scrollTo(0, y); 
            })
        }
    }
})