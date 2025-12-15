import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Header,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { PublicApiService } from './public-api.service';

@Controller('api/public')
export class PublicApiController {
  constructor(private readonly publicApiService: PublicApiService) {}

  // ============ NATIONAL LEVEL ============

  /**
   * Get all dzongkhags as GeoJSON
   * @access Public (No authentication required)
   */
  @Get('national/geojson')
  @HttpCode(HttpStatus.OK)
  async getNationalGeoJson() {
    return this.publicApiService.getNationalGeoJson();
  }

  /**
   * Get all dzongkhags as KML
   * @access Public (No authentication required)
   */
  @Get('national/kml')
  @Header('Content-Type', 'application/vnd.google-earth.kml+xml')
  @Header('Content-Disposition', 'attachment; filename="national_dzongkhags.kml"')
  @HttpCode(HttpStatus.OK)
  async getNationalKml(@Res() res: Response) {
    const kml = await this.publicApiService.getNationalKml();
    res.send(kml);
  }

  /**
   * Get national statistics (households, EAs)
   * @access Public (No authentication required)
   */
  @Get('national/stats')
  @HttpCode(HttpStatus.OK)
  async getNationalStats() {
    return this.publicApiService.getNationalStats();
  }

  // ============ DZONGKHAG LEVEL ============

  /**
   * Get dzongkhag with administrative zones as GeoJSON
   * @param id - Dzongkhag ID
   * @access Public (No authentication required)
   */
  @Get('dzongkhag/:id/geojson')
  @HttpCode(HttpStatus.OK)
  async getDzongkhagGeoJson(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.publicApiService.getDzongkhagGeoJson(id);
  }

  /**
   * Get dzongkhag as KML
   * @param id - Dzongkhag ID
   * @access Public (No authentication required)
   */
  @Get('dzongkhag/:id/kml')
  @Header('Content-Type', 'application/vnd.google-earth.kml+xml')
  @Header('Content-Disposition', 'attachment; filename="dzongkhag.kml"')
  @HttpCode(HttpStatus.OK)
  async getDzongkhagKml(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const kml = await this.publicApiService.getDzongkhagKml(id);
    res.send(kml);
  }

  /**
   * Get dzongkhag statistics (households, EAs)
   * @param id - Dzongkhag ID
   * @access Public (No authentication required)
   */
  @Get('dzongkhag/:id/stats')
  @HttpCode(HttpStatus.OK)
  async getDzongkhagStats(@Param('id', ParseIntPipe) id: number) {
    return this.publicApiService.getDzongkhagStats(id);
  }

  // ============ ADMINISTRATIVE ZONE LEVEL ============

  /**
   * Get administrative zone with SAZs as GeoJSON
   * @param id - Administrative Zone ID
   * @access Public (No authentication required)
   */
  @Get('administrative-zone/:id/geojson')
  @HttpCode(HttpStatus.OK)
  async getAdministrativeZoneGeoJson(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.publicApiService.getAdministrativeZoneGeoJson(id);
  }

  /**
   * Get administrative zone as KML
   * @param id - Administrative Zone ID
   * @access Public (No authentication required)
   */
  @Get('administrative-zone/:id/kml')
  @Header('Content-Type', 'application/vnd.google-earth.kml+xml')
  @Header('Content-Disposition', 'attachment; filename="administrative_zone.kml"')
  @HttpCode(HttpStatus.OK)
  async getAdministrativeZoneKml(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const kml = await this.publicApiService.getAdministrativeZoneKml(id);
    res.send(kml);
  }

  /**
   * Get administrative zone statistics (households, EAs)
   * @param id - Administrative Zone ID
   * @access Public (No authentication required)
   */
  @Get('administrative-zone/:id/stats')
  @HttpCode(HttpStatus.OK)
  async getAdministrativeZoneStats(@Param('id', ParseIntPipe) id: number) {
    return this.publicApiService.getAdministrativeZoneStats(id);
  }

  // ============ SUB-ADMINISTRATIVE ZONE LEVEL ============

  /**
   * Get SAZ with EAs as GeoJSON
   * @param id - Sub-Administrative Zone ID
   * @access Public (No authentication required)
   */
  @Get('sub-administrative-zone/:id/geojson')
  @HttpCode(HttpStatus.OK)
  async getSubAdministrativeZoneGeoJson(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.publicApiService.getSubAdministrativeZoneGeoJson(id);
  }

  /**
   * Get SAZ as KML
   * @param id - Sub-Administrative Zone ID
   * @access Public (No authentication required)
   */
  @Get('sub-administrative-zone/:id/kml')
  @Header('Content-Type', 'application/vnd.google-earth.kml+xml')
  @Header('Content-Disposition', 'attachment; filename="sub_administrative_zone.kml"')
  @HttpCode(HttpStatus.OK)
  async getSubAdministrativeZoneKml(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const kml = await this.publicApiService.getSubAdministrativeZoneKml(id);
    res.send(kml);
  }

  /**
   * Get SAZ statistics (households, EAs)
   * @param id - Sub-Administrative Zone ID
   * @access Public (No authentication required)
   */
  @Get('sub-administrative-zone/:id/stats')
  @HttpCode(HttpStatus.OK)
  async getSubAdministrativeZoneStats(@Param('id', ParseIntPipe) id: number) {
    return this.publicApiService.getSubAdministrativeZoneStats(id);
  }

  // ============ ENUMERATION AREA LEVEL ============

  /**
   * Get EA as GeoJSON
   * @param id - Enumeration Area ID
   * @access Public (No authentication required)
   */
  @Get('enumeration-area/:id/geojson')
  @HttpCode(HttpStatus.OK)
  async getEnumerationAreaGeoJson(@Param('id', ParseIntPipe) id: number) {
    return this.publicApiService.getEnumerationAreaGeoJson(id);
  }

  /**
   * Get EA as KML
   * @param id - Enumeration Area ID
   * @access Public (No authentication required)
   */
  @Get('enumeration-area/:id/kml')
  @Header('Content-Type', 'application/vnd.google-earth.kml+xml')
  @Header('Content-Disposition', 'attachment; filename="enumeration_area.kml"')
  @HttpCode(HttpStatus.OK)
  async getEnumerationAreaKml(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const kml = await this.publicApiService.getEnumerationAreaKml(id);
    res.send(kml);
  }

  /**
   * Get EA statistics (households = EA household count, EAs = 1)
   * @param id - Enumeration Area ID
   * @access Public (No authentication required)
   */
  @Get('enumeration-area/:id/stats')
  @HttpCode(HttpStatus.OK)
  async getEnumerationAreaStats(@Param('id', ParseIntPipe) id: number) {
    return this.publicApiService.getEnumerationAreaStats(id);
  }
}

