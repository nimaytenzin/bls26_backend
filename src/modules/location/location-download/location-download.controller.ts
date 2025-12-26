import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Res,
  Header,
} from '@nestjs/common';
import { Response } from 'express';
import { LocationDownloadService } from './location-download.service';

@Controller('location/download')
export class LocationDownloadController {
  constructor(
    private readonly locationDownloadService: LocationDownloadService,
  ) {}

  /**
   * NATIONAL DATA DOWNLOADS
   * All endpoints are publicly accessible (no authentication required)
   */

  /**
   * Download all Enumeration Areas as GeoJSON
   */
  @Get('national/enumeration-areas/geojson')
  @Header('Content-Type', 'application/geo+json')
  @Header('Content-Disposition', 'attachment; filename="all_enumeration_areas.geojson"')
  async downloadAllEAsAsGeoJson(@Res() res: Response) {
    const geoJson = await this.locationDownloadService.downloadAllEAsAsGeoJson();
    res.json(geoJson);
  }

  /**
   * Download all Enumeration Areas as KML
   */
  @Get('national/enumeration-areas/kml')
  @Header('Content-Type', 'application/vnd.google-earth.kml+xml')
  @Header('Content-Disposition', 'attachment; filename="all_enumeration_areas.kml"')
  async downloadAllEAsAsKml(@Res() res: Response) {
    const kml = await this.locationDownloadService.downloadAllEAsAsKml();
    res.send(kml);
  }

  /**
   * Download all Sub-Administrative Zones as GeoJSON
   */
  @Get('national/sub-administrative-zones/geojson')
  @Header('Content-Type', 'application/geo+json')
  @Header('Content-Disposition', 'attachment; filename="all_sub_administrative_zones.geojson"')
  async downloadAllSAZsAsGeoJson(@Res() res: Response) {
    const geoJson = await this.locationDownloadService.downloadAllSAZsAsGeoJson();
    res.json(geoJson);
  }

  /**
   * Download all Sub-Administrative Zones as KML
   */
  @Get('national/sub-administrative-zones/kml')
  @Header('Content-Type', 'application/vnd.google-earth.kml+xml')
  @Header('Content-Disposition', 'attachment; filename="all_sub_administrative_zones.kml"')
  async downloadAllSAZsAsKml(@Res() res: Response) {
    const kml = await this.locationDownloadService.downloadAllSAZsAsKml();
    res.send(kml);
  }

  /**
   * Download all Administrative Zones as GeoJSON
   */
  @Get('national/administrative-zones/geojson')
  @Header('Content-Type', 'application/geo+json')
  @Header('Content-Disposition', 'attachment; filename="all_administrative_zones.geojson"')
  async downloadAllAZsAsGeoJson(@Res() res: Response) {
    const geoJson = await this.locationDownloadService.downloadAllAZsAsGeoJson();
    res.json(geoJson);
  }

  /**
   * Download all Administrative Zones as KML
   */
  @Get('national/administrative-zones/kml')
  @Header('Content-Type', 'application/vnd.google-earth.kml+xml')
  @Header('Content-Disposition', 'attachment; filename="all_administrative_zones.kml"')
  async downloadAllAZsAsKml(@Res() res: Response) {
    const kml = await this.locationDownloadService.downloadAllAZsAsKml();
    res.send(kml);
  }

  /**
   * Download all Dzongkhags as GeoJSON
   */
  @Get('national/dzongkhags/geojson')
  @Header('Content-Type', 'application/geo+json')
  @Header('Content-Disposition', 'attachment; filename="all_dzongkhags.geojson"')
  async downloadAllDzongkhagsAsGeoJson(@Res() res: Response) {
    const geoJson = await this.locationDownloadService.downloadAllDzongkhagsAsGeoJson();
    res.json(geoJson);
  }

  /**
   * Download all Dzongkhags as KML
   */
  @Get('national/dzongkhags/kml')
  @Header('Content-Type', 'application/vnd.google-earth.kml+xml')
  @Header('Content-Disposition', 'attachment; filename="all_dzongkhags.kml"')
  async downloadAllDzongkhagsAsKml(@Res() res: Response) {
    const kml = await this.locationDownloadService.downloadAllDzongkhagsAsKml();
    res.send(kml);
  }

  /**
   * DZONGKHAG DATA DOWNLOADS
   */

  /**
   * Download Enumeration Areas by Dzongkhag as GeoJSON
   */
  @Get('dzongkhag/:dzongkhagId/enumeration-areas/geojson')
  @Header('Content-Type', 'application/geo+json')
  @Header('Content-Disposition', 'attachment; filename="enumeration_areas_by_dzongkhag.geojson"')
  async downloadEAsByDzongkhagAsGeoJson(
    @Param('dzongkhagId', ParseIntPipe) dzongkhagId: number,
    @Res() res: Response,
  ) {
    const geoJson = await this.locationDownloadService.downloadEAsByDzongkhagAsGeoJson(
      dzongkhagId,
    );
    res.json(geoJson);
  }

  /**
   * Download Enumeration Areas by Dzongkhag as KML
   */
  @Get('dzongkhag/:dzongkhagId/enumeration-areas/kml')
  @Header('Content-Type', 'application/vnd.google-earth.kml+xml')
  @Header('Content-Disposition', 'attachment; filename="enumeration_areas_by_dzongkhag.kml"')
  async downloadEAsByDzongkhagAsKml(
    @Param('dzongkhagId', ParseIntPipe) dzongkhagId: number,
    @Res() res: Response,
  ) {
    const kml = await this.locationDownloadService.downloadEAsByDzongkhagAsKml(
      dzongkhagId,
    );
    res.send(kml);
  }

  /**
   * Download Administrative Zones by Dzongkhag as GeoJSON
   */
  @Get('dzongkhag/:dzongkhagId/administrative-zones/geojson')
  @Header('Content-Type', 'application/geo+json')
  @Header('Content-Disposition', 'attachment; filename="administrative_zones_by_dzongkhag.geojson"')
  async downloadAZsByDzongkhagAsGeoJson(
    @Param('dzongkhagId', ParseIntPipe) dzongkhagId: number,
    @Res() res: Response,
  ) {
    const geoJson = await this.locationDownloadService.downloadAZsByDzongkhagAsGeoJson(
      dzongkhagId,
    );
    res.json(geoJson);
  }

  /**
   * Download Administrative Zones by Dzongkhag as KML
   */
  @Get('dzongkhag/:dzongkhagId/administrative-zones/kml')
  @Header('Content-Type', 'application/vnd.google-earth.kml+xml')
  @Header('Content-Disposition', 'attachment; filename="administrative_zones_by_dzongkhag.kml"')
  async downloadAZsByDzongkhagAsKml(
    @Param('dzongkhagId', ParseIntPipe) dzongkhagId: number,
    @Res() res: Response,
  ) {
    const kml = await this.locationDownloadService.downloadAZsByDzongkhagAsKml(
      dzongkhagId,
    );
    res.send(kml);
  }

  /**
   * Download Sub-Administrative Zones by Dzongkhag as GeoJSON
   */
  @Get('dzongkhag/:dzongkhagId/sub-administrative-zones/geojson')
  @Header('Content-Type', 'application/geo+json')
  @Header('Content-Disposition', 'attachment; filename="sub_administrative_zones_by_dzongkhag.geojson"')
  async downloadSAZsByDzongkhagAsGeoJson(
    @Param('dzongkhagId', ParseIntPipe) dzongkhagId: number,
    @Res() res: Response,
  ) {
    const geoJson = await this.locationDownloadService.downloadSAZsByDzongkhagAsGeoJson(
      dzongkhagId,
    );
    res.json(geoJson);
  }

  /**
   * Download Sub-Administrative Zones by Dzongkhag as KML
   */
  @Get('dzongkhag/:dzongkhagId/sub-administrative-zones/kml')
  @Header('Content-Type', 'application/vnd.google-earth.kml+xml')
  @Header('Content-Disposition', 'attachment; filename="sub_administrative_zones_by_dzongkhag.kml"')
  async downloadSAZsByDzongkhagAsKml(
    @Param('dzongkhagId', ParseIntPipe) dzongkhagId: number,
    @Res() res: Response,
  ) {
    const kml = await this.locationDownloadService.downloadSAZsByDzongkhagAsKml(
      dzongkhagId,
    );
    res.send(kml);
  }

  /**
   * Download Gewog/Thromde by Dzongkhag as GeoJSON
   * (Alias for administrative-zones with explicit naming)
   */
  @Get('dzongkhag/:dzongkhagId/gewog-thromde/geojson')
  @Header('Content-Type', 'application/geo+json')
  @Header('Content-Disposition', 'attachment; filename="gewog_thromde_by_dzongkhag.geojson"')
  async downloadGewogThromdeByDzongkhagAsGeoJson(
    @Param('dzongkhagId', ParseIntPipe) dzongkhagId: number,
    @Res() res: Response,
  ) {
    const geoJson = await this.locationDownloadService.downloadAZsByDzongkhagAsGeoJson(
      dzongkhagId,
    );
    res.json(geoJson);
  }

  /**
   * Download Gewog/Thromde by Dzongkhag as KML
   * (Alias for administrative-zones with explicit naming)
   */
  @Get('dzongkhag/:dzongkhagId/gewog-thromde/kml')
  @Header('Content-Type', 'application/vnd.google-earth.kml+xml')
  @Header('Content-Disposition', 'attachment; filename="gewog_thromde_by_dzongkhag.kml"')
  async downloadGewogThromdeByDzongkhagAsKml(
    @Param('dzongkhagId', ParseIntPipe) dzongkhagId: number,
    @Res() res: Response,
  ) {
    const kml = await this.locationDownloadService.downloadAZsByDzongkhagAsKml(
      dzongkhagId,
    );
    res.send(kml);
  }

  /**
   * Download Chiwog/LAP by Dzongkhag as GeoJSON
   * (Alias for sub-administrative-zones with explicit naming)
   */
  @Get('dzongkhag/:dzongkhagId/chiwog-lap/geojson')
  @Header('Content-Type', 'application/geo+json')
  @Header('Content-Disposition', 'attachment; filename="chiwog_lap_by_dzongkhag.geojson"')
  async downloadChiwogLAPByDzongkhagAsGeoJson(
    @Param('dzongkhagId', ParseIntPipe) dzongkhagId: number,
    @Res() res: Response,
  ) {
    const geoJson = await this.locationDownloadService.downloadSAZsByDzongkhagAsGeoJson(
      dzongkhagId,
    );
    res.json(geoJson);
  }

  /**
   * Download Chiwog/LAP by Dzongkhag as KML
   * (Alias for sub-administrative-zones with explicit naming)
   */
  @Get('dzongkhag/:dzongkhagId/chiwog-lap/kml')
  @Header('Content-Type', 'application/vnd.google-earth.kml+xml')
  @Header('Content-Disposition', 'attachment; filename="chiwog_lap_by_dzongkhag.kml"')
  async downloadChiwogLAPByDzongkhagAsKml(
    @Param('dzongkhagId', ParseIntPipe) dzongkhagId: number,
    @Res() res: Response,
  ) {
    const kml = await this.locationDownloadService.downloadSAZsByDzongkhagAsKml(
      dzongkhagId,
    );
    res.send(kml);
  }

  /**
   * ADMINISTRATIVE ZONE DATA DOWNLOADS
   */

  /**
   * Download Sub-Administrative Zones by Administrative Zone as GeoJSON
   */
  @Get('administrative-zone/:administrativeZoneId/sub-administrative-zones/geojson')
  @Header('Content-Type', 'application/geo+json')
  @Header('Content-Disposition', 'attachment; filename="sub_administrative_zones_by_admin_zone.geojson"')
  async downloadSAZsByAdministrativeZoneAsGeoJson(
    @Param('administrativeZoneId', ParseIntPipe) administrativeZoneId: number,
    @Res() res: Response,
  ) {
    const geoJson = await this.locationDownloadService.downloadSAZsByAdministrativeZoneAsGeoJson(
      administrativeZoneId,
    );
    res.json(geoJson);
  }

  /**
   * Download Sub-Administrative Zones by Administrative Zone as KML
   */
  @Get('administrative-zone/:administrativeZoneId/sub-administrative-zones/kml')
  @Header('Content-Type', 'application/vnd.google-earth.kml+xml')
  @Header('Content-Disposition', 'attachment; filename="sub_administrative_zones_by_admin_zone.kml"')
  async downloadSAZsByAdministrativeZoneAsKml(
    @Param('administrativeZoneId', ParseIntPipe) administrativeZoneId: number,
    @Res() res: Response,
  ) {
    const kml = await this.locationDownloadService.downloadSAZsByAdministrativeZoneAsKml(
      administrativeZoneId,
    );
    res.send(kml);
  }

  /**
   * Download Enumeration Areas by Administrative Zone as GeoJSON
   */
  @Get('administrative-zone/:administrativeZoneId/enumeration-areas/geojson')
  @Header('Content-Type', 'application/geo+json')
  @Header('Content-Disposition', 'attachment; filename="enumeration_areas_by_admin_zone.geojson"')
  async downloadEAsByAdministrativeZoneAsGeoJson(
    @Param('administrativeZoneId', ParseIntPipe) administrativeZoneId: number,
    @Res() res: Response,
  ) {
    const geoJson = await this.locationDownloadService.downloadEAsByAdministrativeZoneAsGeoJson(
      administrativeZoneId,
    );
    res.json(geoJson);
  }

  /**
   * Download Enumeration Areas by Administrative Zone as KML
   */
  @Get('administrative-zone/:administrativeZoneId/enumeration-areas/kml')
  @Header('Content-Type', 'application/vnd.google-earth.kml+xml')
  @Header('Content-Disposition', 'attachment; filename="enumeration_areas_by_admin_zone.kml"')
  async downloadEAsByAdministrativeZoneAsKml(
    @Param('administrativeZoneId', ParseIntPipe) administrativeZoneId: number,
    @Res() res: Response,
  ) {
    const kml = await this.locationDownloadService.downloadEAsByAdministrativeZoneAsKml(
      administrativeZoneId,
    );
    res.send(kml);
  }

  /**
   * Download Chiwogs by Administrative Zone as GeoJSON
   */
  @Get('administrative-zone/:administrativeZoneId/chiwogs/geojson')
  @Header('Content-Type', 'application/geo+json')
  @Header('Content-Disposition', 'attachment; filename="chiwogs_by_admin_zone.geojson"')
  async downloadChiwogsByAdministrativeZoneAsGeoJson(
    @Param('administrativeZoneId', ParseIntPipe) administrativeZoneId: number,
    @Res() res: Response,
  ) {
    const geoJson = await this.locationDownloadService.downloadChiwogsByAdministrativeZoneAsGeoJson(
      administrativeZoneId,
    );
    res.json(geoJson);
  }

  /**
   * Download Chiwogs by Administrative Zone as KML
   */
  @Get('administrative-zone/:administrativeZoneId/chiwogs/kml')
  @Header('Content-Type', 'application/vnd.google-earth.kml+xml')
  @Header('Content-Disposition', 'attachment; filename="chiwogs_by_admin_zone.kml"')
  async downloadChiwogsByAdministrativeZoneAsKml(
    @Param('administrativeZoneId', ParseIntPipe) administrativeZoneId: number,
    @Res() res: Response,
  ) {
    const kml = await this.locationDownloadService.downloadChiwogsByAdministrativeZoneAsKml(
      administrativeZoneId,
    );
    res.send(kml);
  }

  /**
   * SUB-ADMINISTRATIVE ZONE DATA DOWNLOADS
   */

  /**
   * Download Enumeration Areas by Sub-Administrative Zone as GeoJSON
   */
  @Get('sub-administrative-zone/:subAdministrativeZoneId/enumeration-areas/geojson')
  @Header('Content-Type', 'application/geo+json')
  @Header('Content-Disposition', 'attachment; filename="enumeration_areas_by_sub_admin_zone.geojson"')
  async downloadEAsBySubAdministrativeZoneAsGeoJson(
    @Param('subAdministrativeZoneId', ParseIntPipe) subAdministrativeZoneId: number,
    @Res() res: Response,
  ) {
    const geoJson = await this.locationDownloadService.downloadEAsBySubAdministrativeZoneAsGeoJson(
      subAdministrativeZoneId,
    );
    res.json(geoJson);
  }

  /**
   * Download Enumeration Areas by Sub-Administrative Zone as KML
   */
  @Get('sub-administrative-zone/:subAdministrativeZoneId/enumeration-areas/kml')
  @Header('Content-Type', 'application/vnd.google-earth.kml+xml')
  @Header('Content-Disposition', 'attachment; filename="enumeration_areas_by_sub_admin_zone.kml"')
  async downloadEAsBySubAdministrativeZoneAsKml(
    @Param('subAdministrativeZoneId', ParseIntPipe) subAdministrativeZoneId: number,
    @Res() res: Response,
  ) {
    const kml = await this.locationDownloadService.downloadEAsBySubAdministrativeZoneAsKml(
      subAdministrativeZoneId,
    );
    res.send(kml);
  }
}

