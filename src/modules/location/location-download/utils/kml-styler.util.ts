/**
 * Utility functions for styling KML content
 */

/**
 * Add blue borders to all Placemark elements in KML content
 * @param kmlContent - The KML XML string
 * @returns Modified KML with blue borders applied
 */
export function addBlueBordersToKml(kmlContent: string): string {
  // Check if KML already has a Document element with styles
  let modifiedKml = kmlContent;

  // Generate a unique style ID
  const styleId = 'blue-border-style';
  const styleMapId = 'blue-border-stylemap';

  // Create Style element for blue borders
  const styleElement = `
    <Style id="${styleId}">
      <LineStyle>
        <color>ff0000ff</color>
        <width>2</width>
      </LineStyle>
      <PolyStyle>
        <fill>0</fill>
        <outline>1</outline>
      </PolyStyle>
    </Style>
    <StyleMap id="${styleMapId}">
      <Pair>
        <key>normal</key>
        <styleUrl>#${styleId}</styleUrl>
      </Pair>
      <Pair>
        <key>highlight</key>
        <styleUrl>#${styleId}</styleUrl>
      </Pair>
    </StyleMap>`;

  // Check if Document element exists
  if (modifiedKml.includes('<Document>')) {
    // Insert styles right after <Document> tag
    modifiedKml = modifiedKml.replace(
      /(<Document[^>]*>)/,
      `$1${styleElement}`,
    );
  } else if (modifiedKml.includes('<kml')) {
    // If no Document, wrap in Document
    modifiedKml = modifiedKml.replace(
      /(<kml[^>]*>)/,
      `$1<Document>${styleElement}`,
    );
    // Close Document before </kml>
    modifiedKml = modifiedKml.replace(/(<\/kml>)/, '</Document>$1');
  } else {
    // If structure is different, try to add styles at the beginning
    modifiedKml = `<Document>${styleElement}${modifiedKml}</Document>`;
  }

  // Add styleUrl to all Placemark elements
  // Use a more robust approach: find each Placemark and add styleUrl if missing
  const placemarkRegex = /<Placemark[^>]*>([\s\S]*?)<\/Placemark>/g;
  modifiedKml = modifiedKml.replace(placemarkRegex, (match, content) => {
    // Check if styleUrl already exists
    if (content.includes('<styleUrl>')) {
      return match;
    }
    // Add styleUrl right after Placemark opening tag
    return match.replace(
      /(<Placemark[^>]*>)/,
      `$1<styleUrl>#${styleMapId}</styleUrl>\n      `,
    );
  });

  return modifiedKml;
}

/**
 * Add custom styling to KML content
 * @param kmlContent - The KML XML string
 * @param options - Styling options
 * @returns Modified KML with custom styling applied
 */
export interface KmlStyleOptions {
  borderColor?: string; // KML color format: aabbggrr (alpha, blue, green, red) as hex
  borderWidth?: number;
  fillColor?: string;
  fillOpacity?: number; // 0-1
  outline?: boolean;
}

export function addCustomStyleToKml(
  kmlContent: string,
  options: KmlStyleOptions = {},
): string {
  const {
    borderColor = 'ff0000ff', // Default: blue (aabbggrr format)
    borderWidth = 2,
    fillColor = '00ffffff', // Default: white with no fill
    fillOpacity = 0,
    outline = true,
  } = options;

  let modifiedKml = kmlContent;

  // Generate unique style ID
  const styleId = 'custom-style';
  const styleMapId = 'custom-stylemap';

  // Convert fillOpacity (0-1) to KML alpha (00-ff)
  const alphaHex = Math.round(fillOpacity * 255)
    .toString(16)
    .padStart(2, '0');
  const fillColorWithAlpha = `${alphaHex}${fillColor.slice(2)}`;

  // Create Style element
  const styleElement = `
    <Style id="${styleId}">
      <LineStyle>
        <color>${borderColor}</color>
        <width>${borderWidth}</width>
      </LineStyle>
      <PolyStyle>
        <color>${fillColorWithAlpha}</color>
        <fill>${fillOpacity > 0 ? 1 : 0}</fill>
        <outline>${outline ? 1 : 0}</outline>
      </PolyStyle>
    </Style>
    <StyleMap id="${styleMapId}">
      <Pair>
        <key>normal</key>
        <styleUrl>#${styleId}</styleUrl>
      </Pair>
      <Pair>
        <key>highlight</key>
        <styleUrl>#${styleId}</styleUrl>
      </Pair>
    </StyleMap>`;

  // Check if Document element exists
  if (modifiedKml.includes('<Document>')) {
    // Insert styles right after <Document> tag
    modifiedKml = modifiedKml.replace(
      /(<Document[^>]*>)/,
      `$1${styleElement}`,
    );
  } else if (modifiedKml.includes('<kml')) {
    // If no Document, wrap in Document
    modifiedKml = modifiedKml.replace(
      /(<kml[^>]*>)/,
      `$1<Document>${styleElement}`,
    );
    // Close Document before </kml>
    modifiedKml = modifiedKml.replace(/(<\/kml>)/, '</Document>$1');
  } else {
    // If structure is different, try to add styles at the beginning
    modifiedKml = `<Document>${styleElement}${modifiedKml}</Document>`;
  }

  // Add styleUrl to all Placemark elements
  // Use a more robust approach: find each Placemark and add styleUrl if missing
  const placemarkRegex = /<Placemark[^>]*>([\s\S]*?)<\/Placemark>/g;
  modifiedKml = modifiedKml.replace(placemarkRegex, (match, content) => {
    // Check if styleUrl already exists
    if (content.includes('<styleUrl>')) {
      return match;
    }
    // Add styleUrl right after Placemark opening tag
    return match.replace(
      /(<Placemark[^>]*>)/,
      `$1<styleUrl>#${styleMapId}</styleUrl>\n      `,
    );
  });

  return modifiedKml;
}

