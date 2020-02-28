/*!
 * @license
 * Copyright 2019 Alfresco Software, Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Component, SimpleChange, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed, async } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AppConfigService, setupTestBed, CoreModule, DataTableModule, DataRowEvent, ObjectDataRow } from '@alfresco/adf-core';
import { TaskListService } from '../services/tasklist.service';
import { TaskListComponent } from './task-list.component';
import { ProcessTestingModule } from '../../testing/process.testing.module';
import { fakeGlobalTask, fakeCustomSchema, fakeEmptyTask, paginatedTask } from '../../mock';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { TaskListModule } from '../task-list.module';

declare let jasmine: any;

describe('TaskListComponent', () => {
    let component: TaskListComponent;
    let fixture: ComponentFixture<TaskListComponent>;
    let appConfig: AppConfigService;
    let taskListService: TaskListService;

    setupTestBed({
        imports: [
            ProcessTestingModule
        ]
    });

    beforeEach(() => {
        appConfig = TestBed.get(AppConfigService);
        appConfig.config.bpmHost = 'http://localhost:9876/bpm';

        fixture = TestBed.createComponent(TaskListComponent);
        component = fixture.componentInstance;
        taskListService = TestBed.get(TaskListService);

        appConfig.config = Object.assign(appConfig.config, {
            'adf-task-list': {
                'presets': {
                    'fakeCustomSchema': [
                        {
                            'key': 'fakeName',
                            'type': 'text',
                            'title': 'ADF_TASK_LIST.PROPERTIES.FAKE',
                            'sortable': true
                        },
                        {
                            'key': 'fakeTaskName',
                            'type': 'text',
                            'title': 'ADF_TASK_LIST.PROPERTIES.TASK_FAKE',
                            'sortable': true
                        }
                    ]
                }
            }
        });

    });

    beforeEach(() => {
        jasmine.Ajax.install();
    });

    afterEach(() => {
        jasmine.Ajax.uninstall();
        fixture.destroy();
    });

    it('should display loading spinner', () => {
        component.isLoading = true;

        const spinner = fixture.debugElement.query(By.css('.mat-progress-spinner'));
        expect(spinner).toBeDefined();
    });

    it('should hide loading spinner upon loading complete', async(() => {
        component.isLoading = true;
        fixture.detectChanges();

        let spinner = fixture.debugElement.query(By.css('.mat-progress-spinner'));
        expect(spinner).toBeDefined();

        component.isLoading = false;
        fixture.detectChanges();

        fixture.whenStable().then(() => {
            spinner = fixture.debugElement.query(By.css('.mat-progress-spinner'));
            expect(spinner).toBeNull();
        });
    }));

    it('should use the default schemaColumn as default', () => {
        component.ngAfterContentInit();
        expect(component.columns).toBeDefined();
        expect(component.columns.length).toEqual(3);
    });

    it('should use the custom schemaColumn from app.config.json', () => {
        component.presetColumn = 'fakeCustomSchema';
        component.ngAfterContentInit();
        fixture.detectChanges();
        expect(component.columns).toEqual(fakeCustomSchema);
    });

    it('should fetch custom schemaColumn when the input presetColumn is defined', () => {
        component.presetColumn = 'fakeCustomSchema';
        fixture.detectChanges();
        expect(component.columns).toBeDefined();
        expect(component.columns.length).toEqual(2);
    });

    it('should return an empty task list when no input parameters are passed', () => {
        component.ngAfterContentInit();
        expect(component.rows).toBeDefined();
        expect(component.isListEmpty()).toBeTruthy();
    });

    it('should return the filtered task list when the input parameters are passed', (done) => {
        const state = new SimpleChange(null, 'open', true);
        const processDefinitionKey = new SimpleChange(null, null, true);
        const assignment = new SimpleChange(null, 'fake-assignee', true);

        component.success.subscribe((res) => {
            expect(res).toBeDefined();
            expect(component.rows).toBeDefined();
            expect(component.isListEmpty()).not.toBeTruthy();
            expect(component.rows.length).toEqual(2);
            expect(component.rows[0]['name']).toEqual('nameFake1');
            expect(component.rows[0]['description']).toEqual('descriptionFake1');
            expect(component.rows[0]['category']).toEqual('categoryFake1');
            expect(component.rows[0]['assignee'].id).toEqual(2);
            expect(component.rows[0]['assignee'].firstName).toEqual('firstNameFake1');
            expect(component.rows[0]['assignee'].lastName).toEqual('lastNameFake1');
            expect(component.rows[0][('assignee')].email).toEqual('emailFake1');
            expect(component.rows[0]['created'].toISOString()).toEqual('2017-03-01T12:25:17.189Z');
            expect(component.rows[0]['dueDate'].toISOString()).toEqual('2017-04-02T12:25:17.189Z');
            expect(component.rows[0]['endDate'].toISOString()).toEqual('2017-05-03T12:25:31.129Z');
            expect(component.rows[0]['duration']).toEqual(13940);
            expect(component.rows[0]['priority']).toEqual(50);
            expect(component.rows[0]['parentTaskId']).toEqual(1);
            expect(component.rows[0]['parentTaskName']).toEqual('parentTaskNameFake');
            expect(component.rows[0]['processInstanceId']).toEqual(2511);
            expect(component.rows[0]['processInstanceName']).toEqual('processInstanceNameFake');
            expect(component.rows[0]['processDefinitionId']).toEqual('myprocess:1:4');
            expect(component.rows[0]['processDefinitionName']).toEqual('processDefinitionNameFake');
            expect(component.rows[0]['processDefinitionDescription']).toEqual('processDefinitionDescriptionFake');
            expect(component.rows[0]['processDefinitionKey']).toEqual('myprocess');
            expect(component.rows[0]['processDefinitionCategory']).toEqual('http://www.activiti.org/processdef');
            done();
        });
        component.ngAfterContentInit();
        component.ngOnChanges({ 'state': state, 'processDefinitionKey': processDefinitionKey, 'assignment': assignment });
        fixture.detectChanges();

        jasmine.Ajax.requests.mostRecent().respondWith({
            'status': 200,
            contentType: 'application/json',
            responseText: JSON.stringify(fakeGlobalTask)
        });
    });

    it('should return the filtered task list by processDefinitionKey', (done) => {
        const state = new SimpleChange(null, 'open', true);
        /* cspell:disable-next-line */
        const processDefinitionKey = new SimpleChange(null, 'fakeprocess', true);
        const assignment = new SimpleChange(null, 'fake-assignee', true);

        component.success.subscribe((res) => {
            expect(res).toBeDefined();
            expect(component.rows).toBeDefined();
            expect(component.isListEmpty()).not.toBeTruthy();
            expect(component.rows.length).toEqual(2);
            expect(component.rows[0]['name']).toEqual('nameFake1');
            done();
        });

        component.ngAfterContentInit();
        component.ngOnChanges({ 'state': state, 'processDefinitionKey': processDefinitionKey, 'assignment': assignment });
        fixture.detectChanges();

        jasmine.Ajax.requests.mostRecent().respondWith({
            'status': 200,
            contentType: 'application/json',
            responseText: JSON.stringify(fakeGlobalTask)
        });
    });

    it('should return the filtered task list by processInstanceId', (done) => {
        const state = new SimpleChange(null, 'open', true);
        const processInstanceId = new SimpleChange(null, 'fakeprocessId', true);
        const assignment = new SimpleChange(null, 'fake-assignee', true);

        component.success.subscribe((res) => {
            expect(res).toBeDefined();
            expect(component.rows).toBeDefined();
            expect(component.isListEmpty()).not.toBeTruthy();
            expect(component.rows.length).toEqual(2);
            expect(component.rows[0]['name']).toEqual('nameFake1');
            expect(component.rows[0]['processInstanceId']).toEqual(2511);
            done();
        });

        component.ngAfterContentInit();
        component.ngOnChanges({ 'state': state, 'processInstanceId': processInstanceId, 'assignment': assignment });
        fixture.detectChanges();

        jasmine.Ajax.requests.mostRecent().respondWith({
            'status': 200,
            contentType: 'application/json',
            responseText: JSON.stringify(fakeGlobalTask)
        });
    });

    it('should return the filtered task list by processDefinitionId', (done) => {
        const state = new SimpleChange(null, 'open', true);
        const processDefinitionId = new SimpleChange(null, 'fakeprocessDefinitionId', true);
        const assignment = new SimpleChange(null, 'fake-assignee', true);

        component.success.subscribe((res) => {
            expect(res).toBeDefined();
            expect(component.rows).toBeDefined();
            expect(component.isListEmpty()).not.toBeTruthy();
            expect(component.rows.length).toEqual(2);
            expect(component.rows[0]['name']).toEqual('nameFake1');
            expect(component.rows[0]['processDefinitionId']).toEqual('myprocess:1:4');
            done();
        });

        component.ngAfterContentInit();
        component.ngOnChanges({ 'state': state, 'processDefinitionId': processDefinitionId, 'assignment': assignment });
        fixture.detectChanges();

        jasmine.Ajax.requests.mostRecent().respondWith({
            'status': 200,
            contentType: 'application/json',
            responseText: JSON.stringify(fakeGlobalTask)
        });
    });

    it('should return the filtered task list by created date', (done) => {
        const state = new SimpleChange(null, 'open', true);
        const afterDate = new SimpleChange(null, '28-02-2017', true);
        component.success.subscribe((res) => {
            expect(res).toBeDefined();
            expect(component.rows).toBeDefined();
            expect(component.isListEmpty()).not.toBeTruthy();
            expect(component.rows.length).toEqual(2);
            expect(component.rows[0]['name']).toEqual('nameFake1');
            expect(component.rows[0]['processDefinitionId']).toEqual('myprocess:1:4');
            done();
        });
        component.ngAfterContentInit();
        component.ngOnChanges({ 'state': state, 'afterDate': afterDate });
        fixture.detectChanges();
        jasmine.Ajax.requests.mostRecent().respondWith({
            'status': 200,
            contentType: 'application/json',
            responseText: JSON.stringify(fakeGlobalTask)
        });
    });

    it('should return the filtered task list for all state', (done) => {
        const state = new SimpleChange(null, 'all', true);
        /* cspell:disable-next-line */
        const processInstanceId = new SimpleChange(null, 'fakeprocessId', true);

        component.success.subscribe((res) => {
            expect(res).toBeDefined();
            expect(component.rows).toBeDefined();
            expect(component.isListEmpty()).not.toBeTruthy();
            expect(component.rows.length).toEqual(2);
            expect(component.rows[0]['name']).toEqual('nameFake1');
            expect(component.rows[0]['processInstanceId']).toEqual(2511);
            expect(component.rows[0]['endDate']).toBeDefined();
            expect(component.rows[1]['name']).toEqual('No name');
            expect(component.rows[1]['endDate']).toBeUndefined();
            done();
        });

        component.ngAfterContentInit();
        component.ngOnChanges({ 'state': state, 'processInstanceId': processInstanceId });
        fixture.detectChanges();

        jasmine.Ajax.requests.mostRecent().respondWith({
            'status': 200,
            contentType: 'application/json',
            responseText: JSON.stringify(fakeGlobalTask)
        });
    });

    it('should return a currentId null when the taskList is empty', () => {
        component.selectTask(null);
        expect(component.getCurrentId()).toBeNull();
    });

    it('should return selected id for the selected task', () => {
        component.rows = [
            { id: '999', name: 'Fake-name' },
            { id: '888', name: 'Fake-name-888' }
        ];
        component.selectTask('888');
        expect(component.rows).toBeDefined();
        expect(component.currentInstanceId).toEqual('888');
    });

    it('should reload tasks when reload() is called', (done) => {
        component.state = 'open';
        component.assignment = 'fake-assignee';
        component.ngAfterContentInit();
        component.success.subscribe((res) => {
            expect(res).toBeDefined();
            expect(component.rows).toBeDefined();
            expect(component.isListEmpty()).not.toBeTruthy();
            expect(component.rows.length).toEqual(2);
            expect(component.rows[0]['name']).toEqual('nameFake1');
            done();
        });
        fixture.detectChanges();
        component.reload();

        jasmine.Ajax.requests.mostRecent().respondWith({
            'status': 200,
            contentType: 'application/json',
            responseText: JSON.stringify(fakeGlobalTask)
        });
    });

    it('should emit row click event', (done) => {
        const row = new ObjectDataRow({
            id: '999'
        });
        const rowEvent = new DataRowEvent(row, null);

        component.rowClick.subscribe((taskId) => {
            expect(taskId).toEqual('999');
            expect(component.getCurrentId()).toEqual('999');
            done();
        });

        component.onRowClick(rowEvent);
    });

    describe('component changes', () => {

        beforeEach(() => {
            component.rows = fakeGlobalTask.data;
            fixture.detectChanges();
        });

        it('should NOT reload the tasks if the loadingTaskId is the same of the current task', () => {
            spyOn(component, 'reload').and.stub();
            component.currentInstanceId = '999';

            component.rows = [{ id: '999', name: 'Fake-name' }];
            const landingTaskId = '999';
            const change = new SimpleChange(null, landingTaskId, true);
            component.ngOnChanges({ 'landingTaskId': change });
            expect(component.reload).not.toHaveBeenCalled();
            expect(component.rows.length).toEqual(1);
        });

        it('should reload the tasks if the loadingTaskId is different from the current task', (done) => {
            component.currentInstanceId = '999';
            component.rows = [{ id: '999', name: 'Fake-name' }];
            const landingTaskId = '888';
            const change = new SimpleChange(null, landingTaskId, true);

            component.success.subscribe((res) => {
                expect(res).toBeDefined();
                expect(component.rows).toBeDefined();
                expect(component.rows.length).toEqual(2);
                done();
            });

            component.ngOnChanges({ 'landingTaskId': change });

            jasmine.Ajax.requests.mostRecent().respondWith({
                'status': 200,
                contentType: 'application/json',
                responseText: JSON.stringify(fakeGlobalTask)
            });
        });

        it('should NOT reload the task list when no parameters changed', () => {
            component.rows = null;
            component.ngOnChanges({});
            fixture.detectChanges();
            expect(component.isListEmpty()).toBeTruthy();
        });

        it('should reload the list when the appId parameter changes', (done) => {
            const appId = '1';
            const change = new SimpleChange(null, appId, true);

            component.success.subscribe((res) => {
                expect(res).toBeDefined();
                expect(component.rows).toBeDefined();
                expect(component.isListEmpty()).not.toBeTruthy();
                expect(component.rows.length).toEqual(2);
                expect(component.rows[1]['name']).toEqual('No name');
                done();
            });
            component.ngOnChanges({ 'appId': change });

            jasmine.Ajax.requests.mostRecent().respondWith({
                'status': 200,
                contentType: 'application/json',
                responseText: JSON.stringify(fakeGlobalTask)
            });
        });

        it('should reload the list when the processDefinitionKey parameter changes', (done) => {
            const processDefinitionKey = 'fakeprocess';
            const change = new SimpleChange(null, processDefinitionKey, true);

            component.success.subscribe((res) => {
                expect(res).toBeDefined();
                expect(component.rows).toBeDefined();
                expect(component.isListEmpty()).not.toBeTruthy();
                expect(component.rows.length).toEqual(2);
                expect(component.rows[1]['name']).toEqual('No name');
                done();
            });

            component.ngOnChanges({ 'processDefinitionKey': change });

            jasmine.Ajax.requests.mostRecent().respondWith({
                'status': 200,
                contentType: 'application/json',
                responseText: JSON.stringify(fakeGlobalTask)
            });
        });

        it('should reload the list when the state parameter changes', (done) => {
            const state = 'open';
            const change = new SimpleChange(null, state, true);

            component.success.subscribe((res) => {
                expect(res).toBeDefined();
                expect(component.rows).toBeDefined();
                expect(component.isListEmpty()).not.toBeTruthy();
                expect(component.rows.length).toEqual(2);
                expect(component.rows[1]['name']).toEqual('No name');
                done();
            });

            component.ngOnChanges({ 'state': change });

            jasmine.Ajax.requests.mostRecent().respondWith({
                'status': 200,
                contentType: 'application/json',
                responseText: JSON.stringify(fakeGlobalTask)
            });
        });

        it('should reload the list when the sort parameter changes', (done) => {
            const sort = 'desc';
            const change = new SimpleChange(null, sort, true);

            component.success.subscribe((res) => {
                expect(res).toBeDefined();
                expect(component.rows).toBeDefined();
                expect(component.isListEmpty()).not.toBeTruthy();
                expect(component.rows.length).toEqual(2);
                expect(component.rows[1]['name']).toEqual('No name');
                done();
            });

            component.ngOnChanges({ 'sort': change });

            jasmine.Ajax.requests.mostRecent().respondWith({
                'status': 200,
                contentType: 'application/json',
                responseText: JSON.stringify(fakeGlobalTask)
            });
        });

        it('should reload the process list when the name parameter changes', (done) => {
            const name = 'FakeTaskName';
            const change = new SimpleChange(null, name, true);

            component.success.subscribe((res) => {
                expect(res).toBeDefined();
                expect(component.rows).toBeDefined();
                expect(component.isListEmpty()).not.toBeTruthy();
                expect(component.rows.length).toEqual(2);
                expect(component.rows[1]['name']).toEqual('No name');
                done();
            });

            component.ngOnChanges({ 'name': change });

            jasmine.Ajax.requests.mostRecent().respondWith({
                'status': 200,
                contentType: 'application/json',
                responseText: JSON.stringify(fakeGlobalTask)
            });
        });

        it('should reload the list when the assignment parameter changes', (done) => {
            const assignment = 'assignee';
            const change = new SimpleChange(null, assignment, true);

            component.success.subscribe((res) => {
                expect(res).toBeDefined();
                expect(component.rows).toBeDefined();
                expect(component.isListEmpty()).not.toBeTruthy();
                expect(component.rows.length).toEqual(2);
                expect(component.rows[1]['name']).toEqual('No name');
                done();
            });

            component.ngOnChanges({ 'assignment': change });

            jasmine.Ajax.requests.mostRecent().respondWith({
                'status': 200,
                contentType: 'application/json',
                responseText: JSON.stringify(fakeGlobalTask)
            });
        });
    });

    it('should show the updated list when pagination changes', async(() => {
        spyOn(taskListService, 'findTasksByState').and.returnValues(of(fakeGlobalTask), of(paginatedTask));
        const state = new SimpleChange(null, 'open', true);
        const processDefinitionKey = new SimpleChange(null, null, true);
        const assignment = new SimpleChange(null, 'fake-assignee', true);
        component.ngAfterContentInit();
        component.ngOnChanges({ 'state': state, 'processDefinitionKey': processDefinitionKey, 'assignment': assignment });
        fixture.detectChanges();

        fixture.whenStable().then(() => {
            let rows = Array.from(fixture.debugElement.nativeElement.querySelectorAll('.adf-datatable-body adf-datatable-row'));
            expect(rows.length).toEqual(2);
            component.updatePagination({ skipCount: 0, maxItems: 5 });
            fixture.detectChanges();
            rows = Array.from(fixture.debugElement.nativeElement.querySelectorAll('.adf-datatable-body adf-datatable-row'));
            expect(rows.length).toEqual(5);
            expect(taskListService.findTasksByState).toHaveBeenCalledTimes(2);
        });

    }));

    it('should be able to select all tasks when multi-selection is enabled', async(() => {
        spyOn(taskListService, 'findTasksByState').and.returnValues(of(fakeGlobalTask));
        const state = new SimpleChange(null, 'open', true);
        component.multiselect = true;

        component.ngOnChanges({ 'sort': state });
        fixture.detectChanges();

        const selectAllCheckbox = fixture.nativeElement.querySelector('div[class*="adf-datatable-cell-header adf-datatable-checkbox"] div[class="mat-checkbox-inner-container"]');
        selectAllCheckbox.click();
        fixture.detectChanges();
        fixture.whenStable().then(() => {
            expect(component.selectedInstances.length).toBe(2);
            expect(component.selectedInstances[0].obj.name).toBe('nameFake1');
            expect(component.selectedInstances[1].obj.description).toBe('descriptionFake2');

            selectAllCheckbox.click();
            fixture.detectChanges();

            expect(component.selectedInstances.length).toBe(0);
        });
    }));

    it('should be able to unselect a selected tasks using the checkbox', async(() => {
        spyOn(taskListService, 'findTasksByState').and.returnValues(of(fakeGlobalTask));
        const state = new SimpleChange(null, 'open', true);
        component.multiselect = true;

        component.ngOnChanges({ 'sort': state });
        fixture.detectChanges();

        const selectTask1 = fixture.nativeElement.querySelector('[data-automation-id="datatable-row-0"] div[class="mat-checkbox-inner-container"]');
        const selectTask2 = fixture.nativeElement.querySelector('[data-automation-id="datatable-row-1"] div[class="mat-checkbox-inner-container"]');
        selectTask1.click();
        selectTask1.click();
        selectTask2.click();
        fixture.detectChanges();

        fixture.whenStable().then(() => {
            let selectRow1 = fixture.nativeElement.querySelector('[class*="adf-is-selected"][data-automation-id="datatable-row-0"]');
            let selectRow2 = fixture.nativeElement.querySelector('[class*="adf-is-selected"][data-automation-id="datatable-row-1"]');
            expect(selectRow1).toBeDefined();
            expect(selectRow2).toBeDefined();
            expect(component.selectedInstances.length).toBe(2);

            selectTask2.click();
            fixture.detectChanges();

            expect(component.selectedInstances.length).toBe(1);
            selectRow1 = fixture.nativeElement.querySelector('[class*="adf-is-selected"][data-automation-id="datatable-row-0"]');
            selectRow2 = fixture.nativeElement.querySelector('[class*="adf-is-selected"][data-automation-id="datatable-row-1"]');
            expect(selectRow1).toBeDefined();
            expect(selectRow2).toBeNull();
        });
    }));

    it('should not be able to select different row when selection mode is set to NONE and multiselection is enabled', async(() => {
        spyOn(taskListService, 'findTasksByState').and.returnValues(of(fakeGlobalTask));
        const state = new SimpleChange(null, 'open', true);
        component.multiselect = true;
        component.selectionMode = 'none';

        component.ngOnChanges({ 'sort': state });
        fixture.detectChanges();

        const selectTask1 = fixture.nativeElement.querySelector('[data-automation-id="datatable-row-0"] div[class="mat-checkbox-inner-container"]');
        const selectTask2 = fixture.nativeElement.querySelector('[data-automation-id="datatable-row-1"] div[class="mat-checkbox-inner-container"]');
        selectTask1.click();
        selectTask1.click();
        selectTask2.click();
        fixture.detectChanges();

        fixture.whenStable().then(() => {
            let selectRow1 = fixture.nativeElement.querySelector('[class*="adf-is-selected"][data-automation-id="datatable-row-0"]');
            let selectRow2 = fixture.nativeElement.querySelector('[class*="adf-is-selected"][data-automation-id="datatable-row-1"]');
            expect(selectRow1).toBeDefined();
            expect(selectRow2).toBeDefined();
            expect(component.selectedInstances.length).toBe(2);

            selectTask2.click();
            fixture.detectChanges();

            expect(component.selectedInstances.length).toBe(1);
            selectRow1 = fixture.nativeElement.querySelector('[class*="adf-is-selected"][data-automation-id="datatable-row-0"]');
            selectRow2 = fixture.nativeElement.querySelector('[class*="adf-is-selected"][data-automation-id="datatable-row-1"]');
            expect(selectRow1).toBeDefined();
            expect(selectRow2).toBeNull();

            const selectTask2Row = fixture.nativeElement.querySelector('[data-automation-id="text_No name"]');
            selectTask2Row.click();

            selectRow1 = fixture.nativeElement.querySelector('[class*="adf-is-selected"][data-automation-id="datatable-row-0"]');
            selectRow2 = fixture.nativeElement.querySelector('[class*="adf-is-selected"][data-automation-id="datatable-row-1"]');
            expect(selectRow1).toBeDefined();
            expect(selectRow2).toBeNull();
        });
    }));

    it('should select only one row when selection mode is set to SINGLE and multiselection is enabled', async(() => {
        spyOn(taskListService, 'findTasksByState').and.returnValues(of(fakeGlobalTask));
        const state = new SimpleChange(null, 'open', true);
        component.multiselect = true;
        component.selectionMode = 'single';

        component.ngOnChanges({ 'sort': state });
        fixture.detectChanges();

        const selectTask1 = fixture.nativeElement.querySelector('[data-automation-id="datatable-row-0"] div[class="mat-checkbox-inner-container"]');
        const selectTask2 = fixture.nativeElement.querySelector('[data-automation-id="datatable-row-1"] div[class="mat-checkbox-inner-container"]');
        selectTask1.click();
        selectTask1.click();
        selectTask2.click();
        fixture.detectChanges();

        fixture.whenStable().then(() => {
            expect(component.selectedInstances.length).toBe(2);
            const selectTask2Row = fixture.nativeElement.querySelector('[data-automation-id="text_No name"]');
            selectTask2Row.click();

            fixture.detectChanges();
            fixture.whenStable().then(() => {
                fixture.detectChanges();
                expect(component.selectedInstances.length).toBe(1);
                const selectRow1 = fixture.nativeElement.querySelector('[class*="adf-is-selected"][data-automation-id="datatable-row-0"]');
                const selectRow2 = fixture.nativeElement.querySelector('[class*="adf-is-selected"][data-automation-id="datatable-row-1"]');
                expect(selectRow1).toBeNull();
                expect(selectRow2).toBeDefined();
            });
        });
    }));

    it('should change selected row after clicking on different row', async(() => {
        spyOn(taskListService, 'findTasksByState').and.returnValues(of(fakeGlobalTask));
        const state = new SimpleChange(null, 'open', true);

        component.ngOnChanges({ 'sort': state });
        fixture.detectChanges();

        const selectTask1 = fixture.nativeElement.querySelector('[data-automation-id="text_nameFake1"]');
        const selectTask2 = fixture.nativeElement.querySelector('[data-automation-id="text_No name"]');
        selectTask1.click();
        fixture.detectChanges();

        fixture.whenStable().then(() => {
            expect(component.currentInstanceId.toString()).toBe('14');

            selectTask2.click();
            fixture.detectChanges();
            fixture.whenStable().then(() => {
                expect(component.currentInstanceId.toString()).toBe('2');
            });
        });
    }));
});

@Component({
    template: `
    <adf-tasklist #taskList>
        <data-columns>
            <data-column key="name" title="ADF_TASK_LIST.PROPERTIES.NAME" class="full-width name-column"></data-column>
            <data-column key="created" title="ADF_TASK_LIST.PROPERTIES.CREATED" class="hidden"></data-column>
            <data-column key="startedBy" title="ADF_TASK_LIST.PROPERTIES.CREATED" class="desktop-only dw-dt-col-3 ellipsis-cell">
                <ng-template let-entry="$implicit">
                    <div>{{entry.row?.obj?.startedBy | fullName}}</div>
                </ng-template>
            </data-column>
        </data-columns>
    </adf-tasklist>`
})

class CustomTaskListComponent {

    @ViewChild(TaskListComponent)
    taskList: TaskListComponent;
}

describe('CustomTaskListComponent', () => {
    let fixture: ComponentFixture<CustomTaskListComponent>;
    let component: CustomTaskListComponent;

    setupTestBed({
        imports: [CoreModule.forRoot()],
        declarations: [TaskListComponent, CustomTaskListComponent],
        providers: [TaskListService]
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(CustomTaskListComponent);
        fixture.detectChanges();
        component = fixture.componentInstance;
    });

    afterEach(() => {
        fixture.destroy();
    });

    it('should fetch custom schemaColumn from html', () => {
        fixture.detectChanges();
        expect(component.taskList.columnList).toBeDefined();
        expect(component.taskList.columns[0]['title']).toEqual('ADF_TASK_LIST.PROPERTIES.NAME');
        expect(component.taskList.columns[1]['title']).toEqual('ADF_TASK_LIST.PROPERTIES.CREATED');
        expect(component.taskList.columns.length).toEqual(3);
    });
});

@Component({
    template: `
    <adf-tasklist [appId]="1">
        <adf-custom-empty-content-template>
            <p id="custom-id">CUSTOM EMPTY</p>
        </adf-custom-empty-content-template>
    </adf-tasklist>
       `
})
class EmptyTemplateComponent {
}

describe('Task List: Custom EmptyTemplateComponent', () => {
    let fixture: ComponentFixture<EmptyTemplateComponent>;
    let translateService: TranslateService;
    let taskListService: TaskListService;

    setupTestBed({
        imports: [ProcessTestingModule, TaskListModule, DataTableModule],
        declarations: [EmptyTemplateComponent]
    });

    beforeEach(() => {
        translateService = TestBed.get(TranslateService);
        taskListService = TestBed.get(TaskListService);
        spyOn(translateService, 'get').and.callFake((key) => {
            return of(key);
        });
        spyOn(taskListService, 'findTasksByState').and.returnValue(of(fakeEmptyTask));
        fixture = TestBed.createComponent(EmptyTemplateComponent);
        fixture.detectChanges();
    });

    afterEach(() => {
        fixture.destroy();
    });

    it('should render the custom template', (done) => {
        fixture.detectChanges();
        fixture.whenStable().then(() => {
            expect(fixture.debugElement.query(By.css('#custom-id'))).not.toBeNull();
            expect(fixture.debugElement.query(By.css('.adf-empty-content'))).toBeNull();
            done();
        });
    });
});
