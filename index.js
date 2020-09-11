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
            tooltip.innerHTML = `<p class="table-note" style="font-weight:bold">School District ${el.properties["SchoolDist"]}</p>
            <p class="table-note">Number of ${event.target.dataset.label}:</p> <span>${commaFormatter(el.properties[event.target.dataset.dataName])}</span>
            <p class="table-note">Percent of district:</p><span>${percentFormatter(el.properties[event.target.dataset.dataPercent])}</span>`;
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
        tooltip.innerHTML = `<p class="table-note">Programs in zip code ${event.target.dataset.zipCode}:</p> <span>${event.target.dataset.sites}</span>`;
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

//childcare settings data

const infants = [
  { label: "Infants " },
  { category: "Center", stat: 211 },
  { category: "School", stat: 0 },
  { category: "Family", stat: 2061 },
];

const toddlers = [
  { label: "Toddlers" },
  { category: "Center", stat: 1908 },
  { category: "School", stat: 0 },
  { category: "Family", stat: 4400 },
];

const threes = [
  { label: "3-Year-Olds" },
  { category: "Center", stat: 11091 },
  { category: "School", stat: 520 },
  { category: "Family", stat: 2667 },
];

const fours = [
  { label: "4-Year-Olds" },
  { category: "Center", stat: 37696 },
  { category: "School", stat: 30185 },
  { category: "Family", stat: 280 },
];

const createGroupedChart_childcare = () => {
  const colors = ["#ff6633", "#ffa600", "#3366cc"];
  const width = 550,
    height = 220;
  const margin = { left: 0, right: 50, top: 50, bottom: 50 };

  const xScale = d3
    .scaleBand()
    .range([0, width / 4])
    .domain(fours.map((d) => d.category))
    .padding(0.1);

  const yScale = d3.scaleLinear().range([height, 0]).domain([0, 40000]);

  let svg = d3
    .select(`#childcare-settings svg`)
    .attr("width", width + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  //y-axis
  svg
    .append("g")
    .attr("class", "y-axis")
    .call(
      d3
        .axisRight(yScale)
        .tickFormat(d3.format(".0s"))
        .tickSize([width + margin.right - 35])
        .ticks(5)
    )
    .attr("transform", `translate(0,${margin.top})`);
  d3.selectAll(".y-axis .domain").style("visibility", "hidden");
  d3.selectAll(".y-axis .tick line").attr("stroke", "gainsboro");

  const createCharts = (data, transX) => {
    let trimmedData = data.filter((el) => el.category !== undefined);
    let svg = d3.select(`#childcare-settings svg`);
    svg
      .append("g")
      .attr("class", "group")
      .attr("width", width / 4)
      .attr("transform", `translate(${transX},${margin.top})`)
      .selectAll("rect")
      .data(trimmedData)
      .enter()
      .append("rect")
      .attr("x", (d) => {
        return xScale(d.category);
      })
      .attr("width", (d) => {
        return xScale.bandwidth();
      })
      .attr("y", (d) => {
        return yScale(d.stat);
      })
      .attr("height", (d) => height - yScale(d.stat))
      .attr("fill", (d, i) => colors[i])
      .attr("data-setting", (d) => d.category);

    svg
      .append("g")
      .attr("class", "label-group")
      .attr("width", width / 4)
      .attr("transform", `translate(${transX},${margin.top})`)
      .selectAll("text")
      .data(trimmedData)
      .enter()
      .append("text")
      .text((d) => {
        console.log(d)
        if (d.stat !== 0) {
          return commaFormatter(d.stat);
        }
      })
      .attr("x", (d) => {
        return xScale(d.category);
      })
      .attr("y", (d) => {
        return yScale(d.stat);
      })
      .attr("dy", "-.5em")
      .style("font-size", "10px")
      .attr("data-setting", (d) => d.category);

    //overall group labels
    svg
      .append("g")
      .attr("class", "overall-label-group")
      .attr("width", width / 4)
      .attr(
        "transform",
        `translate(${transX + 60},${height + margin.top + 20})`
      )
      .selectAll("text")
      .data(data)
      .enter()
      .append("text")
      .text((d) => {
        return d.label;
      })
      .attr("x", (d) => {
        return xScale(d.key);
      })
      .attr("y", (d) => {
        return yScale(d.value);
      })
      .attr("dy", "-.5em")
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .attr("data-setting", (d) => d.category);
  };
  //run the functions for the graphs for race of workers by industry
  createCharts(infants, 0);
  createCharts(toddlers, 137);
  createCharts(threes, 137 * 2);
  createCharts(fours, 137 * 3);

  let legendIcon = document.querySelectorAll(
    "#childcare-settings .legend-wrapper i"
  );
  let legendText = document.querySelectorAll(
    "#childcare-settings .legend-wrapper span"
  );

  let trimmedData = fours.filter((el) => el.category !== undefined);

  for (let i = 0; i < legendIcon.length; i++) {
    legendIcon[i].style.backgroundColor = colors[i];
    legendIcon[i].dataset.setting = trimmedData[i].category;
    legendText[i].dataset.setting = trimmedData[i].category;
    legendText[i].textContent = trimmedData[i].category;
  }
  //add interactivity

  let elements = document.querySelectorAll(
    "#childcare-settings [data-setting]"
  );
  for (let i = 0; i < elements.length; i++) {
    let unmatchedElements;
    elements[i].addEventListener("mouseenter", (event) => {
      unmatchedElements = document.querySelectorAll(
        `#childcare-settings .legend-wrapper :not([data-setting='${event.target.dataset.setting}']),#childcare-settings .group rect:not([data-setting='${event.target.dataset.setting}']),#childcare-settings svg .label-group text:not([data-setting='${event.target.dataset.setting}'])`
      );
      for (els of unmatchedElements) {
        els.style.opacity = 0.1;
      }
    });

    elements[i].addEventListener("mouseleave", (event) => {
      for (els of unmatchedElements) {
        els.style.opacity = 1;
      }
    });
  }

  // end of function
};

createGroupedChart_childcare();
