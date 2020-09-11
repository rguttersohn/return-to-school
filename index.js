const commaFormatter = d3.format(",");
const percentFormatter = d3.format(",.1%");
const nySDURL = fetch("./nysd.json");
const districtDataURL = fetch("./districtData.json");
const nycZipURL = fetch("New_Zip_Code_Boundary.json");
const sitesURL = fetch("./sites.json");
Promise.all([nySDURL, districtDataURL])
  .then((values) => {
    return Promise.all(values.map((resp) => resp.json()));
  })
  .then(([schoolDistrictMapData, districtData]) => {
    const sdMap = topojson.feature(schoolDistrictMapData, {
      type: "GeometryCollection",
      geometries: schoolDistrictMapData.objects.nysd.geometries,
    });

    // join with district data
    sdMap.features.map((shape) => {
      districtData.forEach((el) => {
        if (
          shape.properties.SchoolDist === parseInt(el["School District Number"])
        ) {
          shape.properties["ELL_Number"] = el["ELL_Number"];
          shape.properties["ELL_Percent"] = el["ELL_Percent"];
          shape.properties["Students in Temporary Housing_Number"] =
            el["Students in Temporary Housing_Number"];
          shape.properties["Students in Temporary Housing_Percent"] =
            el["Students in Temporary Housing_Percent"];
          shape.properties["Students with Disabilities (IEP)_Number"] =
            el["Students with Disabilities (IEP)_Number"];
          shape.properties["Students with Disabilities (IEP)_Percent"] =
            el["Students with Disabilities (IEP)_Percent"];
        }
      });
    });

    const createschoolDistrictMap = () => {
      let tooltip = document.querySelector("#nyc-school-district .tooltip");

      const showTooltip = (event) => {
        tooltip.style.display = "block";
        tooltip.style.opacity = 1;
        tooltip.style.left = `${event.clientX}px`;
        tooltip.style.top = `${event.clientY * 1.1}px`;
        tooltip.style.borderColor = event.target.getAttribute("fill");

        sdMap.features.forEach((el) => {
          if (
            el.properties["SchoolDist"] === parseInt(event.target.dataset.sd)
          ) {
            tooltip.innerHTML = `<p class="table-note" style="font-weight:bold">School District ${
              el.properties["SchoolDist"]
            }</p>
            <p class="table-note">Number of ${
              event.target.dataset.label
            }:</p> ${commaFormatter(
              el.properties[event.target.dataset.dataName]
            )}
            <p class="table-note">Percent of district:</p>${percentFormatter(
              el.properties[event.target.dataset.dataPercent]
            )}`;
          }
        });
      };

      const hideTooltip = () => {
        tooltip.style.display = "none";
      };

      const width = 650,
        height = 650;

      const projection = d3.geoIdentity().fitExtent(
        [
          [20, 20],
          [600, 600],
        ],
        sdMap
      );

      const geoPath = d3.geoPath().projection(projection);

      //create the map
      d3.select("#nyc-school-district .map-wrapper svg")
        .attr("height", height)
        .attr("width", width)
        .style("transform", "scale(1,-1)")
        .append("g")
        .attr("class", "district-shapes")
        .selectAll("path")
        .data(sdMap.features)
        .enter()
        .append("path")
        .attr("d", geoPath)
        .attr("fill", "none")
        .attr("stroke", "gray")
        .attr("stroke-width", "0.5px")
        .attr("data-sd", (d) => d.properties.SchoolDist)
        .on("mouseenter", showTooltip)
        .on("mouseleave", hideTooltip);
    };
    createschoolDistrictMap();

    const schoolDistrictDataInteraction = (data, color) => {
      const colors = [
        ["#0099cd", "#51b3d7", "#82cde1", "#b0e6ee", "#deffff"].reverse(),
        ["#de425b", "#ec7481", "#f69fa7", "#fdc9ce", "#fff3f4"].reverse(),
        ["#019966", "#52b389", "#83ccac", "#b1e6cf", "#e0fff2"].reverse(),
      ];

      activeColor = [];

      const changeMapColor = (activeData) => {
        let max = d3.max(sdMap.features, (d) => d.properties[`${activeData}`]);
        let deviation = d3.deviation(
          sdMap.features,
          (d) => d.properties[`${activeData}`]
        );
        let scale = d3
          .scaleCluster()
          .domain(sdMap.features.map((d) => d.properties[`${activeData}`]))
          .range(activeColor[0]);

        d3.selectAll("#nyc-school-district svg path")
          .data(sdMap.features)
          .transition()
          .duration(300)
          .attr("fill", (d) => scale(d.properties[`${activeData}`]))
          .delay((d, i) => i * 10);

        //adding legend
        const mapLegend = document.querySelectorAll(
          "#nyc-school-district .legend-wrapper i"
        );
        const mapLegendSpans = document.querySelectorAll(
          "#nyc-school-district .legend-wrapper span"
        );

        for (let i = 0; i < mapLegend.length; i++) {
          mapLegend[i].style.backgroundColor = activeColor[0][i];
          mapLegendSpans[i].textContent = commaFormatter(
            scale.export().breakpoints[i]
          );
          mapLegendSpans[i].dataset.value = scale.export().breakpoints[i];
        }
        mapLegendSpans.forEach((span) => {
          if (
            Number(span.dataset.value) !== max &&
            span.nextElementSibling === null
          ) {
            span.classList.add("insert-greater-than");
          } else if (
            Number(span.dataset.value) === max &&
            span.nextElementSibling === null
          ) {
            span.classList.remove("insert-greater-than");
          }
        });
      };

      const buttonLabels = [
        "English Language Learners",
        "Students in Temporary Housing",
        "Students with Disabilities",
      ];
      const dataNames = [
        "ELL_Number",
        "Students in Temporary Housing_Number",
        "Students with Disabilities (IEP)_Number",
      ];

      const dataPercents = [
        "ELL_Percent",
        "Students in Temporary Housing_Percent",
        "Students with Disabilities (IEP)_Percent",
      ];
      let buttons = document.querySelectorAll("#nyc-school-district button");
      let mapHeader = document.querySelector(
        "#nyc-school-district .table-note span"
      );

      //setup initial map presentation
      buttons[0].classList.add("button-active");
      activeColor.push(colors[0]);
      changeMapColor("ELL_Number");
      mapHeader.textContent = "English Language Learners";
      d3.selectAll("#nyc-school-district svg path")
        .attr("data-data-name", dataNames[0])
        .attr("data-data-percent", dataPercents[0])
        .attr("data-label", buttonLabels[0]);

      //adding event to buttons

      for (let i = 0; i < buttons.length; i++) {
        buttons[i].textContent = buttonLabels[i];
        buttons[i].dataset.dataName = dataNames[i];
        buttons[i].dataset.dataPercent = dataPercents[i];

        buttons[i].addEventListener("click", (event) => {
          let active = event.target.parentNode.querySelector(".button-active");

          if (active) {
            active.classList.remove("button-active");
          }
          event.target.classList.add("button-active");
          activeColor.pop();
          activeColor.push(colors[event.target.dataset.colorIndex]);
          changeMapColor(event.target.getAttribute("data-data-name"));
          mapHeader.textContent = event.target.textContent;

          d3.selectAll("#nyc-school-district svg path")
            .attr("data-data-name", event.target.getAttribute("data-data-name"))
            .attr(
              "data-data-percent",
              event.target.getAttribute("data-data-percent")
            )
            .attr("data-label", event.target.textContent);
        });
      }
    };

    schoolDistrictDataInteraction();
    // end of await for school district map
  });

//by zip map and data

Promise.all([nycZipURL, sitesURL])
  .then((values) => {
    return Promise.all(values.map((resp) => resp.json()));
  })
  .then(([nycZipMapData, sitesData]) => {
    const createZipMap = () => {
      let tooltip = document.querySelector("#nyc-zip-code .tooltip");

      const showTooltip = (event) => {
        tooltip.style.display = "block";
        tooltip.style.opacity = 1;
        tooltip.style.left = `${event.clientX}px`;
        tooltip.style.top = `${event.clientY * 1.1}px`;
        tooltip.style.borderColor = event.target.getAttribute("fill");
        tooltip.innerHTML = `<p class="table-note">Programs in zip code ${event.target.dataset.zipCode}:</p> ${event.target.dataset.sites}`;
      };

      const hideTooltip = () => {
        tooltip.style.display = "none";
      };

      const nycZipMap = topojson.feature(nycZipMapData, {
        type: "GeometryCollection",
        geometries: nycZipMapData.objects.New_Zip_Code_Boundary.geometries,
      });

      let mapColors = ["#fff999", "#ffc991", "#ffa3a2", "#a73b7b", "#000066"];

      const width = 650,
        height = 650;

      const projection = d3.geoIdentity().fitExtent(
        [
          [20, 20],
          [600, 600],
        ],
        nycZipMap
      );

      const geoPath = d3.geoPath().projection(projection);

      d3.select("#nyc-zip-code svg")
        .attr("height", height)
        .attr("width", width)
        .style("transform", "scale(1,-1)")
        .selectAll("path")
        .data(nycZipMap.features)
        .enter()
        .append("path")
        .attr("d", geoPath)
        .attr("fill", "white")
        .attr("stroke", "gray")
        .attr("stroke-width", 0.5)
        .attr("data-zip-code", (d) => d.properties.ZIPCODE);

      sitesData.forEach((item) => {
        let paths = document.querySelectorAll(
          `#nyc-zip-code svg path[data-zip-code="${item.ZIPCODE}"]`
        );
        [].forEach.call(paths, (path) => {
          path.dataset.sites = item.Site_count;
        });
      });

      d3.selectAll("#nyc-zip-code svg path")
        .on("mouseenter", showTooltip)
        .on("mouseleave", hideTooltip)
        .each(function () {
          d3.select(this).attr("fill", (d) => {
            let sites = this.dataset.sites;
            if (sites == 0 || sites == null) {
              return mapColors[0];
            }
            if (sites >= 1 && sites <= 7) {
              return mapColors[1];
            }
            if (sites > 7 && sites <= 13) {
              return mapColors[2];
            }

            if (sites > 13 && sites <= 21) {
              return mapColors[3];
            }

            if (sites > 21 && sites <= 35) {
              return mapColors[4];
            }
          });
        });

      const mapLegend = document.querySelectorAll(
        "#nyc-zip-code .legend-wrapper i"
      );
      const mapLegendSpans = document.querySelectorAll(
        "#nyc-zip-code .legend-wrapper span"
      );
      const mapLegendLabels = ["None", "1-7", "8-13", "14-21", "22-35"];
      for (let i = 0; i < mapLegend.length; i++) {
        mapLegend[i].style.backgroundColor = mapColors[i];
        mapLegendSpans[i].textContent = mapLegendLabels[i];
      }
    };

    createZipMap();

    // end of await for zip code map
  });


  //create pie chart

  // pie chart data
const data_ages = [
  { key: "Infants", value: 8000 },
  { key: "Toddlers", value: 15108 },
  { key: "3-year-olds", value: 26478 },
  { key: "4-year-olds", value: 74080 },
];

colors_ages = [
  "#7c5eff",
  "#a787ff",
  "#cab2ff",
  "#e9ddff"];


//pie chart dimensons
const height = 300,
  width = 400,
  margin = 50;

  const createPieChart = (data, colorScheme, selector) => {
    const arc = d3
      .arc()
      .innerRadius(10)
      .outerRadius(width / 2)
      .padAngle(0.05)
      .padRadius(50);
  
    // Compute the position of each group on the pie:
    const pie = d3.pie().value((d) => d.value)(data);
  
    //colors
    const colors = d3.scaleOrdinal(colorScheme);
  
    let pieChartSVG = d3
      .select(`.${selector} svg`)
      .attr("width", width + margin * 2)
      .attr("height", height + margin * 2);
  
    let pieChart = pieChartSVG
      .append("g")
      .attr("class", "pie-chart")
      .attr(
        "transform",
        `translate(${width / 2 + margin},${height / 2 + margin})`
      )
      .selectAll("path")
      .data(pie)
      .enter()
      .append("path")
      .attr("d", arc)
      .style("fill", (d) => colors(d.value))
      .style("stroke", "gray")
      .style("stroke-width", "lightgray")
      .attr('data-category',d=>d.data.key);
  
    //add labels
    let labels = pieChartSVG
      .append("g")
      .attr("class", "pie-chart-labels")
      .attr(
        "transform",
        `translate(${width / 2 + margin},${height / 2 + margin})`
      )
      .selectAll("text")
      .data(pie)
      .enter()
      .append("text")
      .each(function (d) {
        const center = arc.centroid(d);
        d3.select(this).attr("x", center[0]).attr("y", center[1]);
        console.log(this)
      })
      .style("fill", "black")
      .attr("text-anchor", "middle")
      .text((d) => `${d3.format(",")(d.data.value)}`)
      .attr('data-category',d=>d.data.key);
  
    let keyLabels = pieChartSVG
      .append("g")
      .attr("class", "pie-chart-labels")
      .attr(
        "transform",
        `translate(${width / 2 + margin},${height / 2 + margin - 20})`
      )
      .selectAll("text")
      .data(pie)
      .enter()
      .append("text")
      .each(function (d) {
        const center = arc.centroid(d);
        d3.select(this).attr("x", center[0]).attr("y", center[1]);
      })
      .style("fill", "black")
      .style("font-weight", "bold")
      .attr("text-anchor", "middle")
      .text((d) => d.data.key)
      .attr('data-category',d=>d.data.key);
  
    const legendLabels = document.querySelectorAll(
      `.${selector} .legend-wrapper span`
    );
    const legendIcons = document.querySelectorAll(
      `.${selector} .legend-wrapper i`
    );
  
    for (let i = 0; i < legendIcons.length; i++) {
      legendIcons[i].style.backgroundColor = colorScheme[i];
      legendLabels[i].textContent = data[i].key;
      legendIcons[i].dataset.category = data[i].key
      legendLabels[i].dataset.category = data[i].key
    }
  
    //adding interactivity
    let pieChartElements = document.querySelectorAll(
      `.${selector} [data-category]`
    );
  
  
    pieChartElements.forEach((element) => {
      let unmatchedEls;
      element.addEventListener("mouseover", (event) => {
        unmatchedEls = document.querySelectorAll(
          `.${selector} svg path:not([data-category='${event.target.dataset.category}']),.${selector} svg .pie-chart-labels text:not([data-category='${event.target.dataset.category}']),.${selector} .legend-wrapper i:not([data-category='${event.target.dataset.category}']),.legend-wrapper span:not([data-category='${event.target.dataset.category}'])`
        );
        for (let i = 0; i < unmatchedEls.length; i++) {
          unmatchedEls[i].style.opacity = 0.05;
        }
      });
      element.addEventListener("mouseout", (event) => {
        for (let i = 0; i < unmatchedEls.length; i++) {
          unmatchedEls[i].style.opacity = 1;
        }
      });
    });
  
    // end of function
  };

  createPieChart(data_ages, colors_ages, "ages");