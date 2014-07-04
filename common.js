var margin = 5;
var margin_right = 90;
var max_length = 1000;

$(document).ready(
  $(function () {
      getPeriods();
  })
);

function abbreviateNumber(value) {
    var newValue = value.toFixed(2);
    if (value >= 1000) {
        var suffixes = ["", "k", "m", "b","t"];
        var suffixNum = Math.floor( (""+value).length/3 );
        var shortValue = '';
        for (var precision = 2; precision >= 1; precision--) {
            shortValue = parseFloat( (suffixNum != 0 ? (value / Math.pow(1000,suffixNum) ) : value).toPrecision(precision));
            var dotLessShortValue = (shortValue + '').replace(/[^a-zA-Z 0-9]+/g,'');
            if (dotLessShortValue.length <= 2) { break; }
        }
        if (shortValue % 1 != 0)  shortNum = shortValue.toFixed(1);
        newValue = shortValue+suffixes[suffixNum];
    }
    return newValue;
}

function setTextyrule(textyrule, y, x){
    textyrule.attr("class", "yrule")
    .attr("x", x)
    .attr("y", y)
    .attr("dy", 0)
    .attr("dx", 20)    
    .attr("text-anchor", "middle")
    .text(function(n){ return abbreviateNumber(n); });  	
}

function setCurrentValue(svg, scaley, scalex){
	svg.append("g");	
	var rectTx = svg.append('polygon')
					.attr('points', [[20,0],[5,10],[20,20],[90, 20],[90, 0]])
				    .attr('class', 'yruleCursorCurrentValueBox')
                	.attr('transform', function(d){
                		var currentValuePosition = scaley(d.currentData.value);
                		var widthPoint = d.width - margin_right;
                		var heightPoint = currentValuePosition - 13;
                		return 'translate(' + widthPoint + ',' + heightPoint + ')';
                	});				    


	var tx = svg.append("g:text")
				    .attr('class', 'yruleCursor')
					.attr('transform', function(d){
                		var currentValuePosition = scaley(d.currentData.value);
                		var widthPoint = d.width - margin_right + 22;
                		var heightPoint = currentValuePosition + 0;
                		return 'translate(' + widthPoint + ',' + heightPoint + ')';
                	})
                	.text(function(d){ return (d.currentData.value).toFixed(2); });

}

function setMouseEvent(svg, scaley, scalex){
	
	svg.append("g");

  var mv = svg.append("line")
                      .attr("x1", function(d){ return d.width; })
                      .attr("y1", function(d){ return d.height; })
                      .attr("x2", function(d){ return -d.width; })
                      .attr("y2", function(d){ return d.height; })
                      .attr('stroke-dasharray', '3,3')
                      .attr("style", "display: none")
                      .attr("stroke", "#8F8F8F");

	var rectTx = svg.append('polygon')
					.attr('points', [[20,0],[5,10],[20,20],[90, 20],[90, 0]])
					.attr("style", "display: none")
				    .attr('class', 'yruleCursorBox');                      

	var tx = svg.append("g:text")
				    .attr("dx", function(d){ return d.width - margin_right + 22 })
				    .attr("dy", 3)
				    .attr('class', 'yruleCursor');				    				    

  svg.on("mousemove", function(){
  					var mouseCoords = d3.mouse(this);
                    mv.attr("y1", mouseCoords[1] )
                    	.attr("y2", mouseCoords[1] )
                    	.attr("style", "display: initial");

                    tx.attr("y", mouseCoords[1])
                    	.attr("style", "display: initial")
                    	.text(scaley.invert(mouseCoords[1]).toFixed(2));

                    rectTx
                    	.attr("style", "display: initial")
                    	.attr('transform', function(d){
                    		var widthPoint = d.width - margin_right;
                    		var heightPoint = mouseCoords[1] - 10;
                    		return 'translate(' + widthPoint + ',' + heightPoint + ')';
                    	});
  })
  .on("mouseout", function () {
      mv.attr("style", "display: none");
      rectTx.attr("style", "display: none");
      tx.attr("style", "display: none");	
  });	
}

function setLineBorder(svg){
  svg.append("line")
      .attr("x1", function(d){ return d.width; })
      .attr("y1", function(d){ return d.height; })
      .attr("x2", function(d){ return -d.width; })
      .attr("y2", function(d){ return d.height; })
      .attr('stroke-dasharray', '3,3')
      .attr("stroke", "#242424" );
}
