import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { CsContentProgressCalculator } from '@project-sunbird/client-services/services/content/utilities/content-progress-calculator';
import { SharedModule } from '@sunbird/shared';
import { configureTestSuite } from '@sunbird/test-util';
import { of, Subject } from 'rxjs';
import { UserService } from '../../../core/services';
import { PlayerComponent } from './player.component';

const startEvent = {
  detail: {
    telemetryData: {
      eid: 'START'
    }
  }
};
const endEventSuc = {
  detail: {
    telemetryData: {
      eid: 'END',
      edata: { summary: [{ progress: 100 }] }
    }
  }
};
const endEventErr = {
  detail: {
    telemetryData: {
      eid: 'END',
      edata: { summary: [{ progress: 50 }] }
    }
  }
};
const playerConfig = {
  config: {},
  context: {},
  data: {},
  metadata: {}
};
describe('PlayerComponent', () => {
  let component: PlayerComponent;
  let fixture: ComponentFixture<PlayerComponent>;
  let userService;
  configureTestSuite();
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [SharedModule.forRoot(), RouterTestingModule, HttpClientTestingModule],
      declarations: [PlayerComponent],
      providers: [{ provide: UserService, useValue: {} }, CsContentProgressCalculator],
      schemas: [NO_ERRORS_SCHEMA]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PlayerComponent);
    component = fixture.componentInstance;
    component.contentProgressEvents$ = new Subject();
    userService = TestBed.get(UserService);
    userService._authenticated = false;
    component.contentIframe = {
      nativeElement: {
        contentWindow: { EkstepRendererAPI: { getCurrentStageId: () => 'stageId' } },
        remove: jasmine.createSpy()
      }
    };
  });

  it('should emit "START"', fakeAsync(() => {
    let contentProgressEvent;
    component.contentProgressEvents$.subscribe((data) => {
      contentProgressEvent = data;
    });
    spyOn(component, 'emitSceneChangeEvent').and.callFake(() => 'called');
    component.generateContentReadEvent(startEvent);
    component.playerConfig = playerConfig;
    expect(contentProgressEvent).toBeDefined();
  }));

  it('should emit "END" event', () => {
    let contentProgressEvent;
    component.contentProgressEvents$.subscribe((data) => {
      contentProgressEvent = data;
    });
    component.playerConfig = playerConfig;
    component.generateContentReadEvent(endEventSuc);
    expect(contentProgressEvent).toBeDefined();
  });
  it('should emit "END" event and open contentRating', () => {
    let contentProgressEvent;
    spyOn<any>(CsContentProgressCalculator, 'calculate').and.returnValue(100);
    component.contentProgressEvents$.subscribe((data) => {
      contentProgressEvent = data;
    });
    component.modal = { showContentRatingModal: false };
    component.playerConfig = playerConfig;
    component.generateContentReadEvent(endEventSuc);
    component.showRatingPopup(endEventSuc);
    expect(contentProgressEvent).toBeDefined();
    expect(component.contentRatingModal).toBeTruthy();
  });

  it('should call generateContentReadEvent', () => {
    spyOn(component, 'emitSceneChangeEvent');
    component.generateContentReadEvent({ detail: { telemetryData: { eid: 'IMPRESSION' } } });
    expect(component.emitSceneChangeEvent).toHaveBeenCalled();
  });

  it('should call ngOnChange ', () => {
    component.playerConfig = playerConfig;
    component.ngOnChanges({});
    expect(component.contentRatingModal).toBeFalsy();
  });

  describe('should rotate player', () => {
    let mockDomElement;
    beforeEach(() => {
      mockDomElement = document.createElement('div');
      mockDomElement.setAttribute('id', 'playerFullscreen');
    });

    it('should rotate player for a default chrome browser', fakeAsync(() => {
      spyOn(document, 'querySelector').and.returnValue(mockDomElement);
      spyOn(screen.orientation, 'lock');
      component.rotatePlayer();
      tick(100);
      expect(screen.orientation.lock).toHaveBeenCalledWith('landscape');
    }));

    it('should rotate player for mozilla browser', fakeAsync(() => {
      mockDomElement.requestFullscreen = undefined;
      mockDomElement.mozRequestFullScreen = () => { };
      spyOn(document, 'querySelector').and.returnValue(mockDomElement);
      spyOn(screen.orientation, 'lock');
      component.rotatePlayer();
      tick(100);
      expect(screen.orientation.lock).toHaveBeenCalledWith('landscape');
    }));

    it('should rotate player for webkit browser', fakeAsync(() => {
      mockDomElement.requestFullscreen = undefined;
      mockDomElement.mozRequestFullScreen = undefined;
      mockDomElement.webkitRequestFullscreen = () => { };
      spyOn(document, 'querySelector').and.returnValue(mockDomElement);
      spyOn(screen.orientation, 'lock');
      component.rotatePlayer();
      tick(100);
      expect(screen.orientation.lock).toHaveBeenCalledWith('landscape');
    }));

    it('should rotate player ms browser', fakeAsync(() => {
      mockDomElement.requestFullscreen = undefined;
      mockDomElement.mozRequestFullScreen = undefined;
      mockDomElement.webkitRequestFullscreen = undefined;
      mockDomElement.msRequestFullscreen = () => { };
      spyOn(document, 'querySelector').and.returnValue(mockDomElement);
      spyOn(screen.orientation, 'lock');
      component.rotatePlayer();
      tick(100);
      expect(screen.orientation.lock).toHaveBeenCalledWith('landscape');
    }));
  });

  describe('should close the browser fullscreen mode', () => {
    it('should close player fullscreen for default chrome browser', () => {
      component.isSingleContent = true;
      component.closeFullscreen();
      expect(component.showPlayIcon).toBe(true);
    });

    it('should close player fullscreen for mozilla browser', () => {
      document['exitFullscreen'] = undefined;
      document['mozCancelFullScreen'] = () => { };
      component.isSingleContent = true;
      component.closeFullscreen();
      expect(component.showPlayIcon).toBe(true);
    });

    it('should close player fullscreen for webkit browser ', () => {
      document['exitFullscreen'] = undefined;
      document['mozCancelFullScreen'] = undefined;
      document['webkitExitFullscreen'] = () => { };
      component.isSingleContent = true;
      component.closeFullscreen();
      expect(component.showPlayIcon).toBe(true);
    });

    it('should close player fullscreen for ms browser ', () => {
      document['exitFullscreen'] = undefined;
      document['mozCancelFullScreen'] = undefined;
      document['webkitExitFullscreen'] = undefined;
      document['msExitFullscreen'] = () => { };
      component.isSingleContent = true;
      component.closeFullscreen();
      expect(component.showPlayIcon).toBe(true);
    });
  });

  it('should load player on tap of play icon', () => {
    spyOn(component, 'loadPlayer');
    spyOn(component, 'rotatePlayer').and.stub();
    component.enablePlayer(true);
    expect(component.showPlayIcon).toBe(true);
    expect(component.loadPlayer).toHaveBeenCalled();
  });


  it('should close player fullscreen ', () => {
    component.isSingleContent = true;
    component.closeFullscreen();
    expect(component.showPlayIcon).toBe(true);
  });

  it('should remove Iframe element on destroy', () => {
    component.contentIframe = {
      nativeElement: {
        remove: jasmine.createSpy()
      }
    };
    component.ngOnDestroy();
    expect(component.contentIframe.nativeElement.remove).toHaveBeenCalled();
  });

  it('should make isFullScreenView to TRUE', () => {
    component.isFullScreenView = false;
    expect(component.isFullScreenView).toBeFalsy();
    spyOn(component['navigationHelperService'], 'contentFullScreenEvent').and.returnValue(of(true));
    component.ngOnInit();
    component.navigationHelperService.contentFullScreenEvent.subscribe(response => {
      expect(response).toBeTruthy();
      expect(component.isFullScreenView).toBeTruthy();
    });
  });

  it('should make isFullScreenView to FALSE', () => {
    component.isFullScreenView = true;
    expect(component.isFullScreenView).toBeTruthy();
    spyOn(component['navigationHelperService'], 'contentFullScreenEvent').and.returnValue(of(false));
    component.ngOnInit();
    component.navigationHelperService.contentFullScreenEvent.subscribe(response => {
      expect(response).toBeFalsy();
      expect(component.isFullScreenView).toBeFalsy();
    });
  });


  it('should call emitFullScreenEvent', () => {
    component.playerConfig = playerConfig;
    spyOn(component.navigationHelperService, 'emitFullScreenEvent');
    component.closeContentFullScreen();
    expect(component.navigationHelperService.emitFullScreenEvent).toHaveBeenCalledWith(false);
  });

  it('should call closeModal', () => {
    spyOn(component.ratingPopupClose, 'emit');
    component.closeModal();
    expect(component.ratingPopupClose.emit).toHaveBeenCalled();
  });

  it('should adjust player height on landscap mode of mobile or tab device', () => {
    const mockDomElement = document.createElement('div');
    mockDomElement.setAttribute('id', 'contentPlayer');
    spyOn(document, 'querySelector').and.returnValue(mockDomElement);
    spyOn(mockDomElement, 'style').and.returnValue(of({ height: window.innerHeight }));
    fixture.detectChanges();
    component.isMobileOrTab = true;
    component.adjustPlayerHeight();
    fixture.detectChanges();
    expect(screen.orientation.type).toEqual('landscape-primary');
  });

  it('should call emitSceneChangeEvent', (done) => {
    spyOn(component.sceneChangeEvent, 'emit');
    component.emitSceneChangeEvent();
    setTimeout(() => {
      expect(component.sceneChangeEvent.emit).toHaveBeenCalledWith({ stageId: 'stageId' });
      done();
    }, 10);
  });

  it('should call generateScoreSubmitEvent', () => {
    const event = { data: 'renderer:question:submitscore' };
    spyOn(component.questionScoreSubmitEvents, 'emit');
    component.generateScoreSubmitEvent(event);
    expect(component.questionScoreSubmitEvents.emit).toHaveBeenCalled();
  });

  it('should call loadPlayer', () => {
    component.isMobileOrTab = true;
    component.playerConfig = playerConfig;
    spyOn(component, 'rotatePlayer');
    spyOn<any>(component, 'loadDefaultPlayer');
    component.loadPlayer();
    expect(component.rotatePlayer).toHaveBeenCalled();
    expect(component.loadDefaultPlayer).toHaveBeenCalled();
  });

  it('should call loadPlayer with CDN url', () => {
    component.playerConfig = playerConfig;
    component.isMobileOrTab = false;
    component.previewCdnUrl = 'some_url';
    component.isCdnWorking = 'YES';
    spyOn(component, 'loadCdnPlayer');
    component.loadPlayer();
    expect(component.loadCdnPlayer).toHaveBeenCalled();
  });

  it('should call ngAfterViewInit', () => {
    component.playerConfig = { config: {}, context: {}, data: {}, metadata: {} };
    spyOn(component, 'loadPlayer');
    component.ngAfterViewInit();
    expect(component.loadPlayer).toHaveBeenCalled();
  });

  it('should call onPopState', () => {
    spyOn(component, 'closeContentFullScreen');
    component.onPopState({});
    expect(component.closeContentFullScreen).toHaveBeenCalled();
  });
});

