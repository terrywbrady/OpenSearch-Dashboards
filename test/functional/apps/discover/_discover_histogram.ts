/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 *
 * Any modifications Copyright OpenSearch Contributors. See
 * GitHub history for details.
 */

/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import expect from '@osd/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const opensearchArchiver = getService('opensearchArchiver');
  const opensearchChart = getService('opensearchChart');
  const opensearchDashboardsServer = getService('opensearchDashboardsServer');
  const security = getService('security');
  const PageObjects = getPageObjects(['settings', 'common', 'discover', 'header', 'timePicker']);
  const defaultSettings = {
    defaultIndex: 'long-window-logstash-*',
    'dateFormat:tz': 'Europe/Berlin',
    'discover:v2': false,
  };

  describe('discover histogram', function describeIndexTests() {
    before(async () => {
      await opensearchArchiver.loadIfNeeded('logstash_functional');
      await opensearchArchiver.load('long_window_logstash');
      await opensearchArchiver.load('long_window_logstash_index_pattern');
      await security.testUser.setRoles(['opensearch_dashboards_admin', 'long_window_logstash']);
      await opensearchDashboardsServer.uiSettings.replace(defaultSettings);
      await PageObjects.common.navigateToApp('discover');
    });
    after(async () => {
      await opensearchArchiver.unload('long_window_logstash');
      await opensearchArchiver.unload('long_window_logstash_index_pattern');
      await security.testUser.restoreDefaults();
    });

    async function prepareTest(fromTime: string, toTime: string, interval: string) {
      await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
      await PageObjects.discover.waitUntilSearchingHasFinished();
      await PageObjects.discover.setChartInterval(interval);
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    it('should visualize monthly data with different day intervals', async () => {
      const fromTime = 'Nov 01, 2017 @ 00:00:00.000';
      const toTime = 'Mar 21, 2018 @ 00:00:00.000';
      await prepareTest(fromTime, toTime, 'Month');
      const chartCanvasExist = await opensearchChart.canvasExists();
      expect(chartCanvasExist).to.be(true);
    });
    it('should visualize weekly data with within DST changes', async () => {
      const fromTime = 'Mar 01, 2018 @ 00:00:00.000';
      const toTime = 'May 01, 2018 @ 00:00:00.000';
      await prepareTest(fromTime, toTime, 'Week');
      const chartCanvasExist = await opensearchChart.canvasExists();
      expect(chartCanvasExist).to.be(true);
    });
    it('should visualize monthly data with different years scaled to 30 days', async () => {
      const fromTime = 'Jan 01, 2010 @ 00:00:00.000';
      const toTime = 'Mar 21, 2019 @ 00:00:00.000';
      await prepareTest(fromTime, toTime, 'Day');
      const chartCanvasExist = await opensearchChart.canvasExists();
      expect(chartCanvasExist).to.be(true);
      const chartIntervalIconTip = await PageObjects.discover.getChartIntervalWarningIcon();
      expect(chartIntervalIconTip).to.be(true);
    });
  });
}
