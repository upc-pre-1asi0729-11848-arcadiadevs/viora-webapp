import { Component, Input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

import { IotSensorCard as IotSensorCardEntity } from '../../../domain/model/iot-device-summary.entity';

@Component({
  selector: 'app-iot-sensor-card',
  standalone: true,
  imports: [MatCardModule, MatIconModule, TranslatePipe],
  templateUrl: './iot-sensor-card.html',
  styleUrl: './iot-sensor-card.css'
})
export class IotSensorCard {
  @Input() sensor: IotSensorCardEntity | null = null;

  /** i18n key for the card title, derived from the metric the card represents. */
  protected getTitleKey(sensor: IotSensorCardEntity): string {
    const metric = sensor.metricLabel.toLowerCase();

    if (metric.includes('temperature')) {
      return 'cards.iot.soilTemperature';
    }

    if (metric.includes('leaf')) {
      return 'cards.iot.leafHumidity';
    }

    return 'cards.iot.soilMoisture';
  }

  protected getRecommendationKey(sensor: IotSensorCardEntity): string {
    const metric = sensor.metricLabel.toLowerCase();

    if (metric.includes('temperature')) {
      return sensor.riskLevel === 'High'
        ? 'cards.iot.temperatureHigh'
        : sensor.riskLevel === 'Medium'
          ? 'cards.iot.temperatureMedium'
          : 'cards.iot.temperatureLow';
    }

    if (metric.includes('leaf')) {
      return sensor.riskLevel === 'High'
        ? 'cards.iot.leafHigh'
        : sensor.riskLevel === 'Medium'
          ? 'cards.iot.leafMedium'
          : 'cards.iot.leafLow';
    }

    return sensor.riskLevel === 'High'
      ? 'cards.iot.moistureHigh'
      : sensor.riskLevel === 'Medium'
        ? 'cards.iot.moistureMedium'
        : 'cards.iot.moistureLow';
  }
}
