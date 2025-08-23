import React from 'react';
import { Text } from '@chakra-ui/react';
import { Group } from '@visx/group';
import { Bar, Line } from '@visx/shape';
import { AxisBottom } from '@visx/axis';
import { scaleLinear, scalePower } from '@visx/scale';
import { Tooltip, useTooltip } from '@visx/tooltip';
import { commify } from '../utils.tsx';

// Check if screen is mobile using window width
const isMobile = typeof window !== 'undefined' && window.innerWidth <= 520;

const PriceRangeVisualization = ({ data, width, height, spotPrice }) => {
  // Tooltip setup
  const {
    tooltipData,
    tooltipLeft,
    tooltipTop,
    tooltipOpen,
    showTooltip,
    hideTooltip,
  } = useTooltip();

  // Define margins
  const sidePadding = width * 0.05;

  const margin = {
    top:    10,
    bottom: 40,
    left:   sidePadding,
    right:  sidePadding,
  };

  const xMax = width  - margin.left - margin.right;
  const yMax = height - margin.top  - margin.bottom;

  // Determine if we should use a logarithmic scale
  const minPrice = Math.min(...data.map(d => parseFloat(d.priceLower)));
  const useLogScale = minPrice < 0.0001;

  // Create the appropriate scale based on the price range
  const priceScale = useLogScale
    ? scalePower({
        domain: [
          Math.min(...data.map(d => parseFloat(d.priceLower))),
          Math.max(...data.map(d => parseFloat(d.priceUpper))),
        ],
        range: [0, xMax],
        nice: true,
        clamp: false,
      })
    : scaleLinear({
        domain: [
          Math.min(...data.map(d => parseFloat(d.priceLower))),
          Math.max(...data.map(d => parseFloat(d.priceUpper))),
        ],
        range: [0, xMax],
        nice: true,
      });

  // Define the bar heights and colors
  const barProperties = {
    Floor: { height: yMax, color: '#4ade80', width: 4 },
    Anchor: { height: 50, color: '#22c55e' },
    Discovery: { height: 80, color: '#86efac' },
  };

  return (
    <div>
      <svg width={width} height={height}>
        <Group left={margin.left} top={margin.top}>
          {data.map((d, index) => {
            let x0 = priceScale(parseFloat(d.priceLower));
            let x1 = priceScale(parseFloat(d.priceUpper));
            let barWidth = Math.max(2, x1 - x0);

            // Extract color and height
            const { height, color } = barProperties[d.name];

            // Ensure a fixed gap for "Floor" and "Anchor"
            if (d.name === 'Anchor') {
              x0 = priceScale(parseFloat(data.find(x => x.name === 'Floor').priceUpper)) + 10; // Fixed 10px gap
              x1 = x0 + barWidth + 6; // Increase Anchor width by 6px
              barWidth += 6; // Adjust width to match
            }

            // Push "Discovery" further to the right
            if (d.name === 'Discovery') {
              x0 += 20; // Increase this value to push it further
              x1 += 20;
            }

            return (
              <Bar
                key={`bar-${index}`}
                x={x0}
                y={yMax - height}
                width={barWidth}
                height={height}
                fill={color}
                onMouseLeave={hideTooltip}
                onMouseMove={(event) => {
                  showTooltip({
                    tooltipData: d,
                    tooltipLeft: x0 + barWidth / 4,
                    tooltipTop: yMax + (yMax / 4) - height / 4,
                  });
                }}
              />
            );
          })}
          {/* Render the Axis only if it's not a mobile screen */}
          {/* {!isMobile && ( */}
            <AxisBottom
              top={yMax}
              scale={priceScale}
              numTicks={isMobile ? 2 : 4}
              stroke={'#ffffff'}
              tickStroke={'#ffffff'}
              tickLabelProps={() => ({
                fill: '#ffffff',
                fontSize: 11,
                textAnchor: 'middle',
              })}
            />
          {/* )} */}
          
          {/* Spot Price Line */}
          {spotPrice && spotPrice > 0 && (
            <>
              <Line
                from={{ x: priceScale(spotPrice), y: 0 }}
                to={{ x: priceScale(spotPrice), y: yMax }}
                stroke="#9333ea"
                strokeWidth={2}
                strokeDasharray="5,5"
                pointerEvents="none"
              />
              <text
                x={priceScale(spotPrice) + 5}
                y={20}
                fill="#9333ea"
                fontSize="12"
                fontWeight="bold"
                pointerEvents="none"
              >
                Spot
              </text>
            </>
          )}
        </Group>
      </svg>
      {tooltipOpen && (
        <Tooltip left={tooltipLeft} top={tooltipTop}>
          <div>
            <strong>{tooltipData.name}</strong>
            <br />
            <Text fontSize="8px" fontWeight="bold"> {tooltipData.name} </Text>
            <br />
            Amount0: {commify(tooltipData.amount0)}
            <br />
            Amount1: {commify(tooltipData.amount1)}
            <br />
            Price Range: {tooltipData.priceLower} - {tooltipData.priceUpper}
          </div>
        </Tooltip>
      )}
    </div>
  );
};

export default PriceRangeVisualization;
