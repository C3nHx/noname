import { triggerConstant } from '../linmuxi.js';
export function createPreviewDynamicMethods(lib, game, ui, skinSwitch) {
    return {
        previewDynamic: function () {

            let background = ui.create.div('.pfqh-preview-background', ui.window);

            let previewWindow = ui.create.div('.previewWindow', background)
            previewWindow.id = 'previewWindowDiv'
            previewWindow.style = `background: rgb(60,60,60);z-index: 3000;position: fixed; width: 100%; height: 100%;`
            previewWindow.innerHTML = `
            <style>
                a,a:link,a:visited,a:hover,a:active{
                    text-decoration: none;
                    color:inherit;
                }
                #preview-canvas { position: absolute; width: 100% ;height: 100%; }
                #previewSpineDom span {display: inline-block; margin-left: 20px}
                input[type='range'] {
                -webkit-appearance: none;
                width: 180px;
                border-radius: 10px; /*这个属性设置使填充进度条时的图形为圆角*/
              }
              input[type='range']::-webkit-slider-thumb {
                -webkit-appearance: none;
              }
              input[type='range']::-webkit-slider-runnable-track {
                height: 8px;
                border-radius: 10px; /*将轨道设为圆角的*/
                background-color: #d6a63c;
              }
              input[type='range']:focus {
                outline: none;
              }
        
              input[type='range']::-webkit-slider-thumb {
                -webkit-appearance: none;
                height: 24px;
                width: 24px;
                margin-top: -8px; /*使滑块超出轨道部分的偏移量相等*/
                background: #ffffff;
                border-radius: 50%;
                cursor: pointer;
              }
        
              input[type='range']:focus::-webkit-slider-thumb {
                background: #d6a63c;
                /* background-image: url('https://p3-passport.byteacctimg.com/img/user-avatar/fc8114566fc29a28d2d49e1964872775~300x300.image'),
                  -webkit-gradient(linear, left top, left bottom, color-stop(0, #fefefe), color-stop(0.49, #dddddd), color-stop(0.51, #d1d1d1), color-stop(1, #a1a1a1));
                background-size: 20px;
                background-repeat: no-repeat;
                background-position: 50%; */
                box-shadow: 0 0 0 3px #fff, 0 0 0 6px #d6a63c;
              }
        
              input[type='range']::-webkit-slider-thumb:hover {
                background: #d6a63c;
              }
              input[type='range']:active::-webkit-slider-thumb {
                background: #d6a63c;
              }
              
               #previewSpineDom select{
                margin-bottom: 8px;
              }
              
              #previewSpineDom select{
                height: 26px;
              }
              
              .closeBtn {
                border-radius: 3px;
                color: white;
                margin: 0;
                line-height: 1;
                padding: 0 14px;
                height: 34px;
                border: none;
                display: inline-flex;
                flex-wrap: nowrap;
                flex-shrink: 0;
                align-items: center;
                justify-content: center;
                user-select: none;
                text-align: center;
                cursor: pointer;
                text-decoration: none;
                white-space: nowrap;
                background-color: #18a058;  
              }
            
            .wp-s-core-pan__body-detail, .wp-s-core-pan__body-detail div {
                position: relative;
                width: 100%;
                
            }
            
            /* 弹出的框的大小*/
            .wp-s-core-pan__body-detail {
                /*width: 296px;*/
                /*height: 400px;*/
                /*border-left: 1px solid #f0f0f0;*/
            }
            .wp-s-core-pan__detail-slot {
                width: 100%;
                height: 100%;
            }
    
            /*.nd-detail{*/
            /*    display: inline-block;*/
            /*    position: relative;*/
            /*    padding: 24px;*/
            /*    font-size: 12px;*/
            /*    overflow: auto;*/
            /*}*/
            .nd-new-main-list__detail {
                height: 100%;
                width: 100%;
                padding-top: 0!important;
                padding-right: 0!important;
            }
            .nd-new-main-list__detail {
                min-height: 356px;
            }
    
            .nd-new-main-list__detail .nd-detail-filelist__title, .nd-new-main-list__detail .nd-detail__title {
                height: 40px;
                line-height: 40px;
                padding-bottom: 0;
            }
            .nd-detail-filelist__title {
                /*margin-bottom: #f1f2f4;*/
                padding-bottom: 15px;
                font-weight: 600;
                /*color: #03081a;*/
                display: -webkit-box;
                display: -ms-flexbox;
                display: flex;
                -webkit-box-pack: justify;
                -ms-flex-pack: justify;
                justify-content: space-between;
                -webkit-box-align: center;
                -ms-flex-align: center;
                align-items: center;
            }
    
            .nd-detail-filelist__name{
                padding: 12px 0;
                border-bottom: 1px solid #f1f2f4;
                font-size: 14px;
                /*color: #454d5a;*/
                font-weight: 600;
                word-break: break-all;
            }
            
            .nd-detail-filename:hover {
                background-color: #847a93;
                cursor: pointer;
            }
            
            .previewSelect {
                background-color: #847a93;
            }
    
            .nd-detail-filelist__put-away-btn {
                color: #818999;
                cursor: pointer;
                font-weight: 400;
            }
    
            .nd-detail-filelist__put-away-btn .u-uicon{
                margin-right: 4px;
                position: relative;
                top: -1px;
            }
    
            [class*=" u-icon-"], [class^=u-icon-] {
                font-family: union-design-icons!important;
                speak: none;
                font-style: normal;
                font-weight: 400;
                font-variant: normal;
                text-transform: none;
                line-height: 1;
                vertical-align: baseline;
                display: inline-block;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
            }
            .nd-detail-filelist__name .u-file-icon--list {
                width: 32px;
                height: 32px;
                -o-object-fit: contain;
                object-fit: contain;
                margin-right: 8px;
            }
            .u-file-icon.u-file-icon--list {
                width: 40px;
                height: 40px;
            }
            .u-file-icon {
                display: inline-block;
                vertical-align: middle;
            }
    
            .nd-detail-filelist__list {
                width: 100%;
                /*min-height: 400px;*/
                /*height: calc(100% - 140px);*/
                border-radius: 13px;
                position: relative;
                margin-top: 14px;
                padding: 0 12px;
                overflow-y: auto;
            }
            .u-file-icon.u-file-icon--list {
                width: 40px;
                height: 40px;
            }
            .nd-detail-filelist__list .u-file-icon--list {
                width: 24px;
                height: 24px;
            }
    
            .u-file-icon {
                display: inline-block;
                vertical-align: middle;
            }
    
            .nd-detail-filename__title-text {
                padding-left: 5px;
                line-height: 40px;
                max-width: calc(92%);
                text-overflow: ellipsis;
                overflow: hidden;
            }
            .text-clip, .text-ellip, .text-ellipsis {
                overflow: hidden;
                white-space: nowrap;
                text-overflow: ellipsis;
            }
            .inline-block-v-middle {
                display: inline-block;
                vertical-align: middle;
            }
            .text-clip, .text-ellip, .text-ellipsis {
                overflow: hidden;
                white-space: nowrap;
                text-overflow: ellipsis;
            }
            .text-elip, .text-ellip {
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            .inline-block-v-middle {
                display: inline-block;
                vertical-align: middle;
            }
    
            .filesHeight::-webkit-scrollbar {
                width: 10px;
                height: 10px;
                display: block;
            }
    
            .filesHeight::-webkit-scrollbar-track {
                border-radius: 0;
                background: none;
            }
    
            .filesHeight::-webkit-scrollbar-thumb {
                -webkit-box-shadow: inset 0 0 6px rgba(0,0,0,.2);
                background: rgb(255 255 255 / 53%);
            }
    
            .filesHeight::-webkit-scrollbar-thumb:hover {
                border-radius: 5px;
                -webkit-box-shadow: inset 0 0 6px rgba(0,0,0,.2);
                background: rgb(255 200 0);;
            }
            
            .aButton{
                cursor: pointer;
                text-align: center;
                display: block;
                text-decoration: none;
                height: 30px;
                line-height: 30px;
            }
            
            /* 内容宽度*/ 
            /* @media (max-height: 1200px) {*/
            /*     .filesHeight {*/
            /*        overflow-y: auto;*/
            /*        height: 600px;*/
            /*     }*/
            /*}*/
            
            /* @media (max-height: 600px) {*/
            /*    .filesHeight {*/
            /*        overflow-y: auto;*/
            /*        height: 320px;*/
            /*    }*/
            /*}*/
            
            
            /*@media (max-height: 380px) {*/
            /*    .filesHeight {*/
            /*        overflow-y: auto;*/
            /*        height: 260px;*/
            /*    }*/
            /*}*/
            .filesHeight {
                    overflow-y: auto;
                    height: 60vh;
                    overflow-x: hidden;
                }
                
            /* 模式预览样式开始 */
            
            .yk-preview {
                position: relative;
                width: 100%;
                height: 100%;
            }
            
            .yk-preview__container div{
                position: relative;
                display: block;                         
            }
            
            .yk-preview__container {
                position: relative;
                height: calc(100% - 60px);
                transition: width .5s;
            }
            
            .yk-preview__container .yk-preview__closeBtn {
                position: absolute;
                z-index: 9999;
                width: 50px;
                height: 50px;
                text-align: center;
                line-height: 50px;
                border-radius: 50%;
                background-color: rgba(0, 0, 0, 0.8);
                border: 2px solid #fff;
                box-sizing: border-box;
                top: 20px;
                right: 20px;
                color: #fff;
                font-size: 20px;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            }
            
            .yk-preview__container .yk-preview__closeBtn:hover {
                background-color: rgba(255, 0, 0, 0.8);
                transform: scale(1.1);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
            }
            
            .yk-preview__container .yk-preview__list{
                width: 100%;
                height: 100%;
            }
            
            .yk-preview__container .yk-preview__image {
                display: flex;
                align-items: center;
                width: 100%;
                height: 100%;
                text-align: center;
                position: absolute;
            }
            
            .yk-preview__container .yk-preview__operate {
                z-index: 2;
                position: relative;
            }
            
            .yk-preview__container .preview-operate {
                width: 100%;
                height: 60px;
                bottom: 0;
                background-color: rgba(0,0,0,.6);
                color: #c9c9c9;
                font-size: 14px;
                transition: width .5s;
            }
            .yk-preview__container .add-photo, .yk-preview__container .preview-operate {
                position: fixed;
                display: flex;
                justify-content: center;
                align-items: center;
            }
            
            .yk-preview__container .preview-operate .image-detail:last-child {
                margin-right: 0;
            }
            .yk-preview__container .preview-operate .image-delete, .yk-preview__container .preview-operate .image-detail {
                cursor: pointer;
            }
            
            .yk-preview__container .preview-operate .image-detail {
                position: relative;
                padding: 0 15px;
            }
            
            .yk-preview__container .preview-operate .image-detail:last-child {
                margin-right: 0;
            }
            .yk-preview__container .preview-operate .image-delete, .preview-operate .image-detail {
                cursor: pointer;
            }
            .yk-preview__container .preview-operate .image-detail {
                position: relative;
                padding: 0 15px;
            }
            
            .yk-preview__container .preview-operate .iconfont {
                font-size: 28px;
                width: 40px;
                height: 40px;
                vertical-align: middle;
                display: inline-block;
                line-height: 40px;
                text-align: center;
            }
            
            /* 底部关闭按钮特殊样式 */
            #previewOperateClose .image-detail {
                background-color: transparent;
                border-radius: 0;
                border: none;
                transition: all 0.3s ease;
            }
            
            #previewOperateClose .image-detail:hover {
                background-color: transparent;
                transform: scale(1.1);
                box-shadow: none;
            }
            
            #previewOperateClose .iconfont {
                color: #ff4444;
                font-weight: bold;
            }
            
            .yk-preview__container .preview-operate .image-detail .intro {
                border-radius: 6px;
                width: 85px;
                height: 50px;
                top: -65px;
                left: 50%;
                transform: translate(-50%);
                display: flex;
                position: absolute;
                font-family: PingFangSC-Medium;
                font-size: 12px;
                color: #fff;
                letter-spacing: 0;
                text-align: center;
                white-space: nowrap;
                background: #333;
                box-shadow: 0 2px 8px 0 rgb(0 0 0 / 20%);
                line-height: 17px;
                align-items: center;
                justify-content: center;
                flex-direction: column;
            }
            
            .yk-preview__container .preview-operate .image-detail .intro img {
                position: absolute;
                width: 15px;
                height: 9px;
                bottom: -8px;
                left: 50%;
                transform: translate(-50%);
            }
            .yk-preview .yk-preview__info {
                position: fixed;
                top: 0;
                right: 0;
                z-index: 3;
                /*width: 312px;*/
                width: 20%;
                height: 100%;
                padding: 24px 40px;
                margin-bottom: 50px;
                box-sizing: border-box;
                background: #212221;
                color: #fff;
                font-weight: 700;
                transition: right .5s;
            }
            
            .yk-preview .yk-preview__info div {
                display: block;
                position: relative;
            }
            .yk-preview .yk-preview__info .title {
                margin-bottom: 50px;
                font-size: 16px;
            }
            
            .yk-preview .yk-preview__info .info-item {
                display: flex;
                flex-direction: row;
                margin-bottom: 30px;
                font-size: 12px;
                align-items: center;
            }
            
            .yk-preview .yk-preview__info .info-item i {
                width: 24px;
                height: 24px;
                font-size: 20px;
                font-weight: 400;
                color: #999;
            }
            
            .yk-preview .yk-preview__info .info-item .right {
                padding-left: 15px;
                display: flex;
                justify-content: center;
                flex-direction: column;
            }
            .yk-preview .yk-preview__info .info-item .info-name {
                white-space: nowrap;
            }
            .yk-preview .yk-preview__info .info-item .content {
                display: flex;
                flex-wrap: wrap;
                flex: 1;
                color: #999;
                padding-top: 4px;
                font-size: 12px;
                word-break: break-all;
            }
            .yk-preview .yk-preview__info--hidemenu {
                position: absolute !important;
                top: 50%;
                left: 0;
                transform: translateY(-50%);
                cursor: pointer;
                width: 18px;
                height: 70px;
                line-height: 70px;
                text-align: center;
                background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAATJJREFUOBGNkz1uwkAQhbMrI7mkIBJngFMkt0CKLORIdkFBRcEFKNKkoLItWb5FSp+AJlLuEIWeBv/w3rJYtuNdGMkyO7vfm7czRqRpOiuK4s1xnE/f949PD0SSJIu6ridBEOxFHMc7LLZCiB+IvNwTAbypquoDdU54xpKVCUNkDic5HD2bTLTgCswqDMOz4GFChClictKD32E/I6sE+MMmYoI7AiaRsiyX+s603VTmeUbj4LrsOpFS/gKeYm8QHhRgktdB5W/CqFojtebIuNcP2U9wrW0rGI2ly9A0nX8C7YYBXHMqthF3BNqwbtieH5dNpGniAJzBgQrbiJWADb4nIgEvbHO+CfA/4rrua+s6X9yTaNAE75O+c8akKTzP+9MiB3DjPM8ddTaKopEJMuVv8AXIBQzYmzjo8QAAAABJRU5ErkJggg==);
                background-repeat: no-repeat;
                background-size: cover;
            }
            
            .yk-preview .actionItemTagOuter {
                margin: 10px;
                cursor: pointer;
            }

            /* 骨骼部件：槽位名 + 透明度一行（与 Spine 槽位 color.a 一致） */
            .yk-preview .previewModal.slots-inspector-mode .list-container {
                max-width: min(480px, 92vw);
                width: 420px;
            }
            .yk-preview .previewModal.slots-inspector-mode .list-item-box {
                display: block;
                padding: 6px 10px 10px;
            }
            .yk-preview .slotInspectorRow {
                display: flex;
                flex-direction: row;
                align-items: center;
                gap: 8px;
                width: 100%;
                box-sizing: border-box;
                padding: 6px 2px;
                border-bottom: 1px solid #ebeef5;
                text-shadow: none;
            }
            .yk-preview .slotInspectorRow:last-child {
                border-bottom: none;
            }
            .yk-preview .slotInspectorEye {
                flex: 0 0 32px;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                color: #fff;
                font-size: 17px;
            }
            .yk-preview .slotInspectorEye.slot-on {
                background-color: #67c23a;
            }
            .yk-preview .slotInspectorEye.slot-off {
                background-color: #f56c6c;
                opacity: 0.88;
            }
            .yk-preview .slotInspectorName {
                flex: 1 1 auto;
                min-width: 0;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                font-size: 14px;
                color: #303133;
                cursor: default;
            }
            .yk-preview .slotInspectorRight {
                flex: 0 0 auto;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .yk-preview .slotInspectorRight input.slotInspectorAlphaPctInput {
                width: 58px;
                max-width: 24vw;
                padding: 4px 6px;
                font-size: 13px;
                box-sizing: border-box;
                border: 1px solid #dcdfe6;
                border-radius: 4px;
                color: #303133;
            }
            .yk-preview .slotInspectorRight input.slotInspectorAlphaPctInput:focus {
                outline: none;
                border-color: #409eff;
            }
            .yk-preview .slotInspectorStepBtn {
                flex: 0 0 28px;
                width: 28px;
                height: 28px;
                padding: 0;
                font-size: 16px;
                line-height: 1;
                border: 1px solid #dcdfe6;
                border-radius: 4px;
                background: #f5f7fa;
                color: #303133;
                cursor: pointer;
                user-select: none;
            }
            .yk-preview .slotInspectorStepBtn:active {
                background: #e4e7ed;
            }
            .yk-preview .slotInspectorPctSuffix {
                flex: 0 0 auto;
                font-size: 12px;
                color: #606266;
            }
            
            .yk-preview .actionItemTag .actionItemTagIcon {
                border-radius: 50%;
                text-align: center;
                position: relative;
                cursor: pointer;
                font-size: 20px;
                height: 32px;
                width: 32px;
                line-height: 32px;
                vertical-align: middle;
                top: -1px;
                right: -5px;
            }
            .yk-preview .actionItemTag {
                display: inline-block;
                height: 32px;
                /* padding: 10px; */
                line-height: 30px;
                font-size: 16px;
                border-radius: 4px;
                box-sizing: border-box;
                white-space: nowrap;
                /* background-color: #ecf5ff; */
                /* color: #409eff; */
                /* border: 1px solid #d9ecff; */
                background-color: #909399;
                border-color: #909399;
                color: #fff;
                padding-right: 10px;
            }
            
            .yk-preview .list-item-box .selectItemTag {
                color: #409eff;
                border: 1px solid #d9ecff;
                background-color: #ecf5ff;
            }
            
            .yk-preview .actionItemTag.slotVisible {
                background-color: #67c23a;
                border-color: #67c23a;
                color: #fff;
            }
            
            .yk-preview .actionItemTag.slotHidden {
                background-color: #f56c6c;
                border-color: #f56c6c;
                color: #fff;
                opacity: 0.6;
            }
            
            .yk-preview #previewOperateAlpha.alphaSelect {
                color: #0bdee9;
            }
            
            .yk-preview .previewModal {
                position: fixed;
                display: flex;
                justify-content: flex-start;
                align-items: center;
                width: 100%;
                max-height: 60%;
                bottom: calc(120px);
                z-index: 99999;
                transition: all 0s;
                padding-left: 20px;
            }
            
            .yk-preview .list-container {
                width: 300px;
                max-width: 30%;
                max-height: 70vh;
                position: relative;
                background: #fff;
                border: 1px solid #ebeef5;
                border-radius: 6px;
                box-shadow: 0 2px 12px 0 rgb(0 0 0 / 10%);
                z-index: 10000;
                display: flex;
                flex-direction: column;
                justify-content: flex-start;
                align-items: center;
                overflow: hidden;
            }
            
            .yk-preview .closeModal {
                width: 20px;
                height: 20px;
                background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAATJJREFUOBGNkz1uwkAQhbMrI7mkIBJngFMkt0CKLORIdkFBRcEFKNKkoLItWb5FSp+AJlLuEIWeBv/w3rJYtuNdGMkyO7vfm7czRqRpOiuK4s1xnE/f949PD0SSJIu6ridBEOxFHMc7LLZCiB+IvNwTAbypquoDdU54xpKVCUNkDic5HD2bTLTgCswqDMOz4GFChClictKD32E/I6sE+MMmYoI7AiaRsiyX+s603VTmeUbj4LrsOpFS/gKeYm8QHhRgktdB5W/CqFojtebIuNcP2U9wrW0rGI2ly9A0nX8C7YYBXHMqthF3BNqwbtieH5dNpGniAJzBgQrbiJWADb4nIgEvbHO+CfA/4rrua+s6X9yTaNAE75O+c8akKTzP+9MiB3DjPM8ddTaKopEJMuVv8AXIBQzYmzjo8QAAAABJRU5ErkJggg==) no-repeat;
                background-size: cover;
                position: absolute;
                top: 17px;
                right: 20px;
                cursor: pointer;
                z-index: 9;
            }
            
            .yk-preview .list-item-box {
               text-shadow: none;
            }
            
            .yk-preview .list-title {
                width: 100%;
                height: 50px;
                line-height: 50px;
                font-size: 24px;
                text-align: center;
                color: #333;
                  text-shadow: none;
            }
            
            .yk-preview .list-item-box {
                display: flex;
                flex-wrap: wrap;
                justify-content: flex-start;
                align-content: flex-start;
                max-height: calc(70vh - 100px);
                overflow-y: auto;
                overflow-x: hidden;
                padding: 10px;
                box-sizing: border-box;
                width: 100%;
            }
            
            .yk-preview .list-item-box::-webkit-scrollbar {
                width: 8px;
            }
            
            .yk-preview .list-item-box::-webkit-scrollbar-track {
                background: #f1f1f1;
                border-radius: 4px;
            }
            
            .yk-preview .list-item-box::-webkit-scrollbar-thumb {
                background: #c1c1c1;
                border-radius: 4px;
            }
            
            .yk-preview .list-item-box::-webkit-scrollbar-thumb:hover {
                background: #a8a8a8;
            }
            
            .bpx-player-ctrl-volume.bpx-state-show .bpx-player-ctrl-volume-box {
                display: block;
            }
            
            .yk-preview .bpx-player-ctrl-volume-box {
                /* display: none; */
                position: absolute;
                bottom: 41px;
                left: 50%;
                margin-left: -16px;
                width: 32px;
                height: 160px;
                background: rgba(21,21,21,.9);
                border-radius: 2px;
            }
            .yk-preview .bpx-player-ctrl-volume-number {
                color: #e5e9ef;
                width: 100%;
                text-align: center;
                font-size: 12px;
                height: 28px;
                line-height: 28px;
                margin-bottom: 2px;
            }
            .yk-preview .bui-slider {
                height: 12px;
                cursor: pointer;
            }
            
            .yk-preview .bui {
                display: -webkit-box;
                display: -ms-flexbox;
                display: flex;
                vertical-align: middle;
                -webkit-box-align: center;
                -ms-flex-align: center;
                align-items: center;
                -webkit-box-pack: start;
                -ms-flex-pack: start;
                justify-content: flex-start;
            }
            
            .yk-preview .bpx-player-ctrl-volume-progress {
                margin: 0 auto;
                height: 80px!important;
            }
            
            .yk-preview .bui .bui-area {
                width: 100%;
                height: 100%;
                display: -webkit-box;
                display: -ms-flexbox;
                display: flex;
                vertical-align: middle;
                -webkit-box-align: center;
                -ms-flex-align: center;
                align-items: center;
                -webkit-box-pack: start;
                -ms-flex-pack: start;
                justify-content: flex-start;
                line-height: normal;
                -webkit-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
                user-select: none;
            }
            
            .yk-preview .bpx-player-ctrl-volume-progress .bui-area {
                -webkit-box-pack: center!important;
                -ms-flex-pack: center!important;
                justify-content: center!important;
            }
            
            .yk-preview .bui-slider .bui-track.bui-track-vertical {
                height: 100%;
                width: 5px;
                -webkit-box-align: end;
                -ms-flex-align: end;
                align-items: flex-end;
            }
            
            
            .yk-preview .bui-slider .bui-track {
                position: relative;
                width: 100%;
                height: 2px;
                display: -webkit-box;
                display: -ms-flexbox;
                display: flex;
                -webkit-box-align: center;
                -ms-flex-align: center;
                align-items: center;
            }
            .yk-preview .bui-slider .bui-track .bui-bar-wrap {
                position: absolute;
                top: 0;
                bottom: 0;
                left: 0;
                right: 0;
                border-radius: 2.5px;
                overflow: hidden;
                background: #e7e7e7;
            }
            .yk-preview .bui-slider .bui-track.bui-track-vertical .bui-bar-wrap .bui-bar {
                position: absolute;
                -webkit-transform-origin: 0 100%;
                transform-origin: 0 100%;
                top: 0;
                bottom: 0;
                left: 0;
                right: 0;
                background: #00a1d6;
            }
            
            .yk-preview .bui-slider .bui-track .bui-bar-wrap .bui-bar {
                position: absolute;
                -webkit-transform-origin: 0 0;
                transform-origin: 0 0;
                top: 0;
                bottom: 0;
                left: 0;
                right: 0;
                background: #00a1d6;
            }
            
            .yk-preview .bui-slider .bui-track.bui-track-vertical .bui-thumb {
                bottom: 0;
                top: auto;
                position: relative;
            }
            
            .yk-preview .bui-slider .bui-track .bui-thumb {
                cursor: pointer;
            }
            
            .bui-slider .bui-track .bui-thumb .bui-thumb-dot, .bui-slider .bui-track .bui-thumb .bui-thumb-dot-special {
                -webkit-transition: all .2s;
                -o-transition: all .2s;
                transition: all .2s;
                -webkit-transform: translateZ(0);
                transform: translateZ(0);
            }
            
            .yk-preview .bui-slider .bui-track .bui-thumb .bui-thumb-dot {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background-color: #00a1d6;
                display: -webkit-box;
                display: -ms-flexbox;
                display: flex;
                vertical-align: middle;
                -webkit-box-align: center;
                -ms-flex-align: center;
                align-items: center;
            }
            
            </style>
            <canvas id="preview-canvas"></canvas>
            <div id="previewSpineDom" style="color: #fff; position: absolute; top: 0; left: 30px;">
                <span style="font-weight: bold">spine动画预览窗口</span>
                <span id="curVersionText">当前版本:</span>
                <span><a id="foldTreeAbtn" href="#unique-id" class="closeBtn aButton" style="display: block">目录</a></span>
                 <span>flipX:</span><input type="checkbox" id="flipX">
                <span>flipY:</span><input type="checkbox" id="flipY">
                <span>x: <input id="posX" type="number" value="0.5" step="0.05" style="width: 50px"></span>
                <span>y: <input id="posY" type="number" value="0.5" step="0.05" style="width: 50px"></span>
<!--                        <span>Debug:</span><input type="checkbox" id="debug">-->
                <span>α预乘:</span><input type="checkbox" id="premultipliedAlpha">
                <span title="仅在贴图上传到显存时生效；勾选时自动勾选 α预乘">Unpack预乘:</span><input type="checkbox" id="unpackPremultipliedAlpha">
           
                <span>动画标签:</span><select id="animationList"></select>
                <span>皮肤:</span><select id="skinList"></select>
             
                <span>动画时长:<span id="aniTime"></span></span>
                <span>大小:<input id="scale" type="number" value="0.5" step="0.05" style="width: 50px"></span>

                <button id="closePreviewWindow" style="margin-left: 20px; margin-top: 10px;" class="closeBtn">关闭预览窗口</button>
            </div>
            <!--  模态框       -->
            <div class="light-modal" id="unique-id" role="dialog" aria-labelledby="light-modal-label" aria-hidden="false">
                <div class="light-modal-content animated zoomInUp">
                    <!-- light modal header -->
                    <div class="light-modal-header">
                        <h3 class="light-modal-heading">选择文件夹预览</h3>
                        <a href="#" id="closeTreeModal" class="light-modal-close-icon" aria-label="close">&times;</a>
                    </div>
                    <!-- light modal body -->
                    <div class="light-modal-body">
                       <div class="wp-s-core-pan__body-detail">
                         <div class="wp-s-core-pan__detail-slot">
                            <section class="nd-detail nd-new-main-list__detail"><!---->
                                <div class="nd-detail-filelist" 
                                     type="simple">
                                    <div class="nd-detail-filelist__contain">
                                        <div class="nd-detail-filelist__title">
                                            <div>文件夹内容</div>
                                            <div style="display: flex; align-items: center">
                                                <i class="iconfont icon-paixu1" id="btnSortDirFiles" style="cursor: pointer; margin-right: 25px;margin-left: -40px;font-size: 26px;"></i>
                                                <i class="iconfont icon-fanhui" id="btnReturnLastDir" style="cursor: pointer; font-size: 20px;margin-right: 25px; "></i>
                                                <i class="iconfont icon-shousuo" id="btnShouSuoDir" style="cursor: pointer; font-size: 26px;"></i>
                                            </div>
                                        </div>
                                        <div class="nd-detail-filelist__name"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAMAAAC5zwKfAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAABRUExURUxpcf++Hv/ZU//OPv/DL/+9Gv/BI/+4Bf+4Ef/XcP/LOP/TSf/RRP/WTv/JM/+3Ef+9Ff/bhf+5BP/DJf+yDv/imv/kqv/bXP/w0v/fd//calQXUgwAAAAKdFJOUwB///8d3L9enl8sr20gAAACN0lEQVRYw+2Y65abIBRGE1EzVbyNSW18/wctHA6XYw4q9Ee7Vt2AgOHbcVyTOMztdnFxcXFMWf7gKHN190VRKDpFC0iNqB5ZvqpXzJRxHoF7hrAa9/hK9j2oYIA2QA/UqXeyNg5QDBrshhHbUH8xxO+uT7sOJ/tU5a4wh0eK8KmKHTxd28Bfo16pqphep5l6I+R/p8xr668kVghVceH8M5EZYnGhnBKRceGqmaZXPPw2xbO+1xU+8axwe8NfzkIV7xVZdF0AVhi+rWdxIfgmwloE6CkrDCPwJbYUeFgK61icxFcNKyxIxE+WgnllQ0y4+HffzZ8WZtJlCDtz+CzqaaFaVGiWBNEOZZ15zihsT2CFnXk4QStsLohTU3FC+Af8I8JWV1fa1jy8u+hnOUy2vnd5SkeGrJBfHZwDbxe87pfxQvejmMZZYxxdYSoyVyixSvtXFLJ7hWq5xCRNSTozczzHCj8T54kI5d8QCtvZAodDIa7DgRkJaII2hBfaJC7EOE7D076XuIoVBu8oN3kpBLVt4YXBVaUSFSbS5Akb00znSoPn9KCJCN0am7SnGhganC4kKhR2MV0vvEn4M7bFhM3GIZqtgfiPr9BdSAYnrnCX3rQeB/2xsKcHouiBBhpO+phQL9CdjmKqsRkXpkMz57dmfTY1v3k8is26zvN2A6yIbKVqm/tMjFBMp5jpxrWKbsB1dJw/AsC3Lt/YEaK7x1t5r7aLj3ned/fRj1TK3H9wXFxc/F/8BgM0jBZ4nc19AAAAAElFTkSuQmCC"
                                                                                alt="folder" class="u-file-icon u-file-icon--list"><span id="pfqhCurFold">当前文件夹</span></div>
                                        <div class="nd-detail-filelist__list bg">
                                          
                                            <div style="display: flex; flex-direction: row">
                                              <div class="filesHeight" style="width: 45%;">
                                                 <div id="pfqhFoldList" style="white-space: nowrap;  display: flex;flex-direction: column; width: 90%" >
                                                        <div class="nd-detail-filename" id="pfqhLastDir">
                                                        <img
                                                             src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAMAAAC5zwKfAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAABRUExURUxpcf++Hv/ZU//OPv/DL/+9Gv/BI/+4Bf+4Ef/XcP/LOP/TSf/RRP/WTv/JM/+3Ef+9Ff/bhf+5BP/DJf+yDv/imv/kqv/bXP/w0v/fd//calQXUgwAAAAKdFJOUwB///8d3L9enl8sr20gAAACN0lEQVRYw+2Y65abIBRGE1EzVbyNSW18/wctHA6XYw4q9Ee7Vt2AgOHbcVyTOMztdnFxcXFMWf7gKHN190VRKDpFC0iNqB5ZvqpXzJRxHoF7hrAa9/hK9j2oYIA2QA/UqXeyNg5QDBrshhHbUH8xxO+uT7sOJ/tU5a4wh0eK8KmKHTxd28Bfo16pqphep5l6I+R/p8xr668kVghVceH8M5EZYnGhnBKRceGqmaZXPPw2xbO+1xU+8axwe8NfzkIV7xVZdF0AVhi+rWdxIfgmwloE6CkrDCPwJbYUeFgK61icxFcNKyxIxE+WgnllQ0y4+HffzZ8WZtJlCDtz+CzqaaFaVGiWBNEOZZ15zihsT2CFnXk4QStsLohTU3FC+Af8I8JWV1fa1jy8u+hnOUy2vnd5SkeGrJBfHZwDbxe87pfxQvejmMZZYxxdYSoyVyixSvtXFLJ7hWq5xCRNSTozczzHCj8T54kI5d8QCtvZAodDIa7DgRkJaII2hBfaJC7EOE7D076XuIoVBu8oN3kpBLVt4YXBVaUSFSbS5Akb00znSoPn9KCJCN0am7SnGhganC4kKhR2MV0vvEn4M7bFhM3GIZqtgfiPr9BdSAYnrnCX3rQeB/2xsKcHouiBBhpO+phQL9CdjmKqsRkXpkMz57dmfTY1v3k8is26zvN2A6yIbKVqm/tMjFBMp5jpxrWKbsB1dJw/AsC3Lt/YEaK7x1t5r7aLj3ned/fRj1TK3H9wXFxc/F/8BgM0jBZ4nc19AAAAAElFTkSuQmCC"
                                                             alt="folder" class="category u-file-icon u-file-icon--list">
                                                        <span class="nd-detail-filename__title-text inline-block-v-middle text-ellip">返回上级</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div class="filesHeight" style="margin-left: 5%; width: 50%; ">
                                                    <div id="pfqhFilesList" style="white-space: nowrap; display: flex;flex-direction: column; width: 90%">
                                                    </div>
                                                </div>
                                                
                                            </div>
                                            
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </div>
            </div>
            <!-- 图集模式预览 -->
            <div class="picPreviewBg hidden" id="picPreviewBg" style="width: 100%; height: 100%; left: 0; top: 0">
                <div class="yk-preview">
                    <div class="yk-preview__container" style="width: 100%;" id="previewContainer">
                        <div class="yk-preview__closeBtn" id="closeImgPreview" title="关闭预览">
                            <i class="iconfont icon-close"></i>
                        </div>
                        <div class="yk-preview__list">
                           
                        </div>
                        <div class="yk-preview__operate">
                            <div class="preview-operate" id="preview-operate" style="width: 100%;">
                                <div id="opFoldTree" style="position: absolute; left: 10px; cursor:pointer;"><i class="iconfont icon-shuliebiao"></i></div>
                                <div id="previewOperateLeft">
                                    <div class="image-detail">
                                        <i class="iconfont icon-left"></i>
                                    </div>
                                </div>
                                <div id="previewOperateRight">
                                    <div class="image-detail">
                                        <i class="iconfont icon-right"></i>
                                    </div>
                                </div>
                                   <div id="previewOperateQieHuan">
                                    <div class="image-detail">
                                      <i class="iconfont icon-qiehuan"></i>
                                    </div>
                                </div>
                                <div id="previewOperateFangda">
                                    <div class="image-detail">
                                        <i class="iconfont icon-fangda"></i>
                                    </div>
                                </div>
                                <div id="previewOperateSuoxiao">
                                    <div class="image-detail">
                                      <i class="iconfont icon-suoxiao"></i>
                                    </div>
                                </div>
                                <div id="previewOperateNizhuan">
                                    <div class="image-detail">
                                        <i class="iconfont icon-nizhuan"></i>
                                    </div>
                                </div>
                                <div id="previewOperateAlpha"> 
                                    <div class="image-detail">
                                      <i class="iconfont icon-alpha"></i>
                                    </div>
                                </div>
                                <div id="previewOperateDonghuaAction">
                                    <div class="image-detail">
                                      <i class="iconfont icon-donghua"></i>
                                    </div>
                                </div>
                                <div id="previewOperatePifu">
                                    <div class="image-detail">
                                      <i class="iconfont icon-pifu"></i>
                                    </div>
                                </div>
                                <div id="previewOperateBoneSlots">
                                    <div class="image-detail">
                                      <span style="font-size: 24px;">🧩</span>
                                    </div>
                                </div>
                                
                                 <div id="previewOperateSpeed">
                                    <div class="image-detail">
                                      <i class="iconfont icon-sudutiaojie"></i>
                                    </div>
                                    <div class="bpx-player-ctrl-volume-box hidden" id="previewOperateSpeedCtrl">
                                        <div class="bpx-player-ctrl-volume-number">1.0</div>
                                        <div class="bpx-player-ctrl-volume-progress bui bui-slider" id="dataProgressBar">
                                            <div class="bui-area">
                                                <div class="bui-track bui-track-vertical" style="">
                                                    <div class="bui-bar-wrap">
                                                        <div class="bui-bar bui-bar-normal" role="progressbar" style="transform: scaleY(0.61);"></div>
                                                    </div>
                                                    <div class="bui-thumb" style="left: -4px; transform: translateY(-29.28px);">
                                                        <div class="bui-thumb-dot" style=""></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div id="previewOperateInfo">
                                    <div class="image-detail">
                                      <i class="iconfont icon-info1"></i>
                                    </div>
                                </div>
                                <div id="previewOperateClose">
                                    <div class="image-detail" title="关闭预览">
                                      <i class="iconfont icon-close"></i>
                                    </div>
                                </div>
                                
                                <div class="previewModal hidden" id="previewImgModal">
                                    <div class="list-container">
                                        <div class="closeModal" id="closeModal"></div>
                                        <div style="width: 100%">
                                            <div class="list-title" id="previewModalTitle">骨骼标签</div>
                                            <div class="list-item-box" id="modalItemsList">具体内容</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                      
                    </div>
                    <div class="yk-preview__info hidden" id="previewDetailInfo">
                        <div class="title">详情</div>
                        <div class="info-wrap">
                            <div class="info-item"><i class="iconfont icon-kanwumingcheng"></i>
                                <div class="right">
                                    <div class="info-name">骨骼名称</div>
                                    <div class="content">无</div>
                                </div>
                            </div>
                            <div class="info-item"><i class="iconfont icon-banben"></i>
                                <div class="right">
                                    <div class="label">版本</div>
                                    <div class="content">3.6</div>
                                </div>
                            </div>
                            <div class="info-item"><i class="iconfont icon-shichang"></i>
                                <div class="right">
                                    <div class="label">动画时长</div>
                                    <div class="content">5</div>
                                </div>
                            </div>
                            <div class="info-item"><i class="iconfont icon-donghua"></i>
                                <div class="right">
                                    <div class="label">动作信息</div>
                                    <div class="content">标签: idle, 皮肤: default</div>
                                </div>
                            </div>
                            <div class="info-item"><i class="iconfont icon-qitaxinxi"></i>
                                <div class="right">
                                    <div class="label">其他信息</div>
                                    <div class="content">大小: 0.5, 速度: 1.0</div>
                                </div>
                            </div>
                        </div>
                        <div class="yk-preview__info--hidemenu" id="previewInfoHideMenu"><i class="u-icon-next-page"></i>
                        </div>
                    </div>
                </div>
            </div>
            `

            let canvas;
            let activeSkeleton = null
            let currentNode = null
            let isClosed = false   // 全局信号, 通知关闭, 停止渲染
            let isUpdate = false
            const previewSpineDom = document.getElementById('previewSpineDom')

            canvas = document.getElementById('preview-canvas')

            let animationManager = new AnimationManager(lib.assetURL, canvas, 123456)

            // 被监视的元素
            let px = document.getElementById('posX')
            let py = document.getElementById('posY')
            let canvasSize = canvas.getBoundingClientRect()

            let dpr = Math.max(window.devicePixelRatio * (window.documentZoom ? window.documentZoom : 1), 1)
            canvas.width = dpr * skinSwitch.bodySize().width
            canvas.height = dpr * skinSwitch.bodySize().height
            let x = 0.65 * canvasSize.width
            let y = 0.5 * canvasSize.height
            let scale = 0.5
            // 开始监视el上的手势变化
            const at = new AnyTouch(canvas)
            let currentPath = lib.config[skinSwitch.configKey.lastPreviewPath]
            if (!currentPath) {
                game.saveConfig(skinSwitch.configKey.lastPreviewPath, 'extension/皮肤切换/assets')
                currentPath = 'extension/皮肤切换/assets';
            }
            // 检查文件夹是否存在, 不存在初始化为默认文件夹
            skinSwitch.qhly_checkFileExist(currentPath, (exists) => {
                if (!exists) {
                    currentPath = 'extension/皮肤切换/assets'
                }
            })

            // 获取模态框文件夹和文件列表dom
            let foldsEle = document.getElementById('pfqhFoldList')
            let filesEle = document.getElementById('pfqhFilesList')
            let curFoldEle = document.getElementById('pfqhCurFold')

            let clickName = lib.config.touchscreen ? 'touchend' : 'click'

            let lastSelFile = null
            if (!skinSwitch.nodePreviewedInfo) {
                skinSwitch.nodePreviewedInfo = {};  // 保存已经预览的骨骼的相关数据
            }

            /** 预览：复制到剪贴板并提示（文件列表骨骼名、部件名等共用） */
            const previewClipboardCopy = (name, typeLabel) => {
                const input = document.createElement('textarea')
                input.setAttribute('readonly', 'readonly')
                input.value = name
                document.body.appendChild(input)
                if (document.execCommand('copy')) {
                    input.select()
                    document.execCommand('copy')
                    if (window.skinSwitchMessage) {
                        skinSwitchMessage.show({
                            type: 'success',
                            text: `已复制${typeLabel}: ${name}`,
                            duration: 1500,
                            closeable: false,
                        })
                    }
                }
                document.body.removeChild(input)
            }

            /** 序列化槽位透明度 / 隐藏状态，写入 nodePreviewedInfo */
            const cloneSkinSwitchSlotStateForSave = (node) => {
                const out = {}
                if (!node) return out
                if (node._skinSwitchPreviewSlotAlphas && node._skinSwitchPreviewSlotAlphas.size) {
                    const o = {}
                    node._skinSwitchPreviewSlotAlphas.forEach(function (val, key) {
                        const n = Number(val)
                        if (!Number.isFinite(n)) return
                        o[key] = Math.max(0, Math.min(1, n))
                    })
                    if (Object.keys(o).length) out.slotAlphas = o
                }
                if (node._skinSwitchPreviewHiddenSlots && node._skinSwitchPreviewHiddenSlots.size) {
                    out.hiddenSlotNames = Array.from(node._skinSwitchPreviewHiddenSlots)
                }
                return out
            }

            const applySlotStateFromPlayInfoToNode = (node, playInfo) => {
                if (!node || !playInfo) return
                if (playInfo.slotAlphas != null && typeof playInfo.slotAlphas === 'object' && !Array.isArray(playInfo.slotAlphas)) {
                    node._skinSwitchPreviewSlotAlphas = new Map()
                    for (const sk in playInfo.slotAlphas) {
                        if (!Object.prototype.hasOwnProperty.call(playInfo.slotAlphas, sk)) continue
                        let sv = Number(playInfo.slotAlphas[sk])
                        if (!Number.isFinite(sv)) continue
                        sv = Math.max(0, Math.min(1, sv))
                        if (sv < 0.999) node._skinSwitchPreviewSlotAlphas.set(sk, sv)
                    }
                    if (node._skinSwitchPreviewSlotAlphas.size === 0) delete node._skinSwitchPreviewSlotAlphas
                } else {
                    delete node._skinSwitchPreviewSlotAlphas
                }
                if (Array.isArray(playInfo.hiddenSlotNames) && playInfo.hiddenSlotNames.length) {
                    node._skinSwitchPreviewHiddenSlots = new Set(playInfo.hiddenSlotNames.map(function (x) { return String(x) }))
                } else {
                    delete node._skinSwitchPreviewHiddenSlots
                }
            }

            /** 将已恢复的 Map/Set 应用到当前 skeleton（需在 playSpine / init 之后调用） */
            const applySkinSwitchPreviewSlotVisualToSkeleton = (node) => {
                if (!node || !node.skeleton) return
                const sk = node.skeleton
                if (node._skinSwitchPreviewSlotAlphas) {
                    node._skinSwitchPreviewSlotAlphas.forEach((a, slotName) => {
                        const sl = sk.findSlot(slotName)
                        if (sl && sl.color) sl.color.a = a
                    })
                }
                if (node._skinSwitchPreviewHiddenSlots) {
                    node._skinSwitchPreviewHiddenSlots.forEach((slotName) => {
                        const sl = sk.findSlot(slotName)
                        if (sl) sl.setAttachment(null)
                    })
                }
            }

            const persistPreviewNodeAlpha = () => {
                if (!currentNode) return
                const fn = currentNode.name
                if (fn && skinSwitch.nodePreviewedInfo[fn] !== false) {
                    const prev = typeof skinSwitch.nodePreviewedInfo[fn] === 'object' && skinSwitch.nodePreviewedInfo[fn] !== null
                        ? skinSwitch.nodePreviewedInfo[fn]
                        : {}
                    const next = Object.assign({}, prev, {
                        alpha: !!currentNode.premultipliedAlpha,
                        unpackPremultipliedAlpha: !!currentNode.unpackPremultipliedAlpha,
                    })
                    delete next.slotAlphas
                    delete next.hiddenSlotNames
                    Object.assign(next, cloneSkinSwitchSlotStateForSave(currentNode))
                    skinSwitch.nodePreviewedInfo[fn] = next
                }
            }

            // 添加页面可见性变化和页面卸载事件监听器，用于保存当前路径
            const saveCurrentPath = () => {
                if (currentPath) {
                    game.saveConfig(skinSwitch.configKey.lastPreviewPath, currentPath)
                }
            }

            // 页面可见性变化时保存路径
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    saveCurrentPath()
                }
            })

            // 页面卸载时保存路径
            window.addEventListener('beforeunload', saveCurrentPath)
            window.addEventListener('pagehide', saveCurrentPath)

            // 添加搜索框 - 确保DOM元素已存在再添加
            if (foldsEle && foldsEle.parentNode) {
                // 创建一个新的搜索行容器
                let searchRow = document.createElement('div');
                searchRow.className = 'folder-search-row';
                searchRow.style.padding = '5px';
                searchRow.style.marginBottom = '10px';
                searchRow.style.width = '100%';
                searchRow.style.display = 'flex';
                searchRow.style.flexDirection = 'row';
                searchRow.style.alignItems = 'center';
                searchRow.style.borderBottom = '1px solid #ddd';
                searchRow.style.paddingBottom = '10px';

                // 搜索框内容
                searchRow.innerHTML = `
                    <span style="margin-right: 10px; white-space: nowrap; font-weight: bold;">搜索文件:</span>
                    <input type="text" placeholder="<小曦>提供搜索" id="folderSearchInput" style="flex-grow: 1; padding: 6px; border-radius: 4px; border: 1px solid #ccc; box-sizing: border-box; font-size: 13px;">
                    <button id="clearSearchBtn" style="margin-left: 10px; padding: 4px 12px; border-radius: 4px; border: 1px solid #ccc; background: #f5f5f5; cursor: pointer; box-sizing: border-box; font-size: 13px;">清除</button>
                `;

                // 获取文件内容区域的父元素，将搜索行插入到整个文件列表的顶部
                let fileContentContainer = document.querySelector('.nd-detail-filelist__name').parentNode;
                fileContentContainer.insertBefore(searchRow, fileContentContainer.firstChild);

                // 搜索功能实现 - 直接通过创建的元素获取引用
                let folderSearchInput = searchRow.querySelector('#folderSearchInput');
                let clearSearchBtn = searchRow.querySelector('#clearSearchBtn');

                if (folderSearchInput && clearSearchBtn) {
                    folderSearchInput.addEventListener('input', function () {
                        let searchValue = this.value;  // 不转为小写，保留中文原样
                        let allFolders = foldsEle.querySelectorAll('.nd-detail-filename');

                        // 第一个是返回上层目录按钮，从第二个开始是文件夹
                        for (let i = 1; i < allFolders.length; i++) {
                            let folderName = allFolders[i].getAttribute('fold');
                            if (folderName) {
                                // 不转为小写，保留中文原样
                                if (searchValue === '' || folderName.indexOf(searchValue) !== -1) {
                                    allFolders[i].style.display = 'block';
                                    // 确保元素可交互
                                    allFolders[i].style.pointerEvents = 'auto';
                                } else {
                                    allFolders[i].style.display = 'none';
                                    // 不要阻止其他交互
                                    allFolders[i].style.pointerEvents = 'none';
                                }
                            }
                        }
                    });

                    clearSearchBtn.addEventListener(clickName, function () {
                        folderSearchInput.value = '';
                        // 触发input事件以更新显示
                        folderSearchInput.dispatchEvent(new Event('input'));
                    });
                }
            }

            let currentFoldInfo = {
                curFiles: [],  // 存储当前目录下的spine文件列表
                curFileIndex: 0,  // 当前在文件夹的索引
            }

            let contentModal = document.getElementById('unique-id').getElementsByClassName('light-modal-body')[0]

            contentModal.addEventListener('touchstart', touchstart, true);
            contentModal.addEventListener('touchmove', touchmove, true);//添加touchmove方法
            contentModal.addEventListener('touchend', touchend, true);
            function touchstart(e) {
                // console.log(e.changedTouches[0].pageY,"开始时触摸的位置")
                this.move = false //添加一个move参数，触摸时置为false
                // this.start = e.changedTouches[0].pageY
                this.start = e.pageY
            }
            function touchmove() {
                this.move = true // 触发滑动事件时move置为true
            }

            function touchend(e) {
                // this.end = e.changedTouches[0].pageY
                this.end = e.pageY
                if (this.move) { //只有当move为true时才会触发滑动事件
                    e.stopPropagation()
                } else {
                    if (e.target.touchend) {
                        e.target.touchend(e.target)
                    }
                }
            }


            curFoldEle.innerText = currentPath

            const returnLastDir = function (e) {
                // 获取之前预览的文件夹名字
                let lastDirName
                if (currentPath) {
                    lastDirName = currentPath.substring(currentPath.lastIndexOf('/') + 1, currentPath.length)
                }
                currentPath = currentPath === '' ? '' : currentPath.substring(0, currentPath.lastIndexOf('/'));
                game.saveConfig(skinSwitch.configKey.lastPreviewPath, currentPath)
                initFoldsInfo(lastDirName)
            }

            // 返回上一级事件
            document.getElementById('pfqhLastDir').addEventListener(clickName, function (e) {
                returnLastDir()
            })
            // 同返回上一级
            document.getElementById('btnReturnLastDir').addEventListener(clickName, function (e) {
                returnLastDir()
            })
            // 收缩文件夹
            document.getElementById('btnShouSuoDir').addEventListener(clickName, function (e) {
                let node = foldsEle.parentNode
                let fileNode = filesEle.parentNode
                let isHide = node.style.display === 'none'
                if (isHide) {
                    node.style.display = 'inline-block'
                    fileNode.style.width = '50%'
                    fileNode.style.marginLeft = '5%'
                } else {
                    node.style.display = 'none'
                    fileNode.style.width = '100%'
                    fileNode.style.marginLeft = '0px'
                }
            })

            let sortDirs = (sorts) => {
                let box = document.getElementById('pfqhFoldList')
                let arr = []
                for (let i = 1; i < box.children.length; i++) {
                    arr.push(box.children[i])
                }
                if (sorts == null || sorts === 0) {
                    arr.sort(function (a, b) {
                        return a.getAttribute('fold').localeCompare(b.getAttribute('fold'))
                    })

                } else if (sorts === 1) {
                    arr.sort(function (a, b) {
                        return b.getAttribute('fold').localeCompare(a.getAttribute('fold'))
                    })
                }

                for (let i = 0; i < arr.length; i++) {
                    box.appendChild(arr[i])
                }
            }

            document.getElementById('btnSortDirFiles').addEventListener(clickName, function (e) {
                let sorts = this._sorts
                if (sorts == null || sorts === 1) {
                    this._sorts = 0
                    this.classList.add('icon-paixu1')
                    this.classList.remove('icon-daoxu')
                } else {
                    this._sorts = 1
                    this.classList.remove('icon-paixu1')
                    this.classList.add('icon-daoxu')
                }
                sortDirs(this._sorts)
            })

            // 只过滤出包含完整spine骨骼的文件进行预览
            let filterSpineFile = (files) => {
                let skinInfoMap = {}
                for (let f of files) {
                    let name = f.substring(0, f.lastIndexOf("."))
                    let ext = f.substring(f.lastIndexOf(".") + 1)
                    if (!(name in skinInfoMap)) {
                        skinInfoMap[name] = {}
                    }
                    if (ext === 'png') {
                        skinInfoMap[name].png = true
                    } else if (ext === 'skel') {
                        skinInfoMap[name].type = 'skel';
                    } else if (ext === 'json') {
                        skinInfoMap[name].type = 'json';
                    } else if (ext === 'atlas') {
                        skinInfoMap[name].altas = true
                    }
                }
                let retFiles = []
                for (let k in skinInfoMap) {
                    let info = skinInfoMap[k]
                    // 如果十周年文件里面已经有了对应武将和对应皮肤的话, 跳过.
                    if (info.type && info.altas /*&& info.png*/) {
                        retFiles.push({
                            path: k + '.' + info.type,
                            name: k
                        })
                    }

                }
                return retFiles
            }

            let initFoldsInfo = (lastDirName) => {
                // 获取这个文件夹下的所有合法的skel文件和所有文件夹
                pfqhUtils.getFoldsFiles(currentPath, function (file, path) {
                    let suffixes = ['.png', '.atlas', '.json', '.skel', '.jpg']
                    for (let suf of suffixes) {
                        if (file.endsWith(suf)) {
                            return true
                        }
                    }
                    return false
                }, function (folds, files) {
                    curFoldEle.innerText = currentPath
                    // 删除之前节点
                    for (let i = foldsEle.childNodes.length - 1; i > 1; i--) {
                        foldsEle.childNodes[i].remove()
                    }
                    for (let i = filesEle.childNodes.length - 1; i > 0; i--) {
                        filesEle.childNodes[i].remove()
                    }
                    for (let i = 0; i < folds.length; i++) {
                        let div = document.createElement('div');
                        div.innerHTML = `
                            <img
                                 src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAMAAAC5zwKfAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAABRUExURUxpcf++Hv/ZU//OPv/DL/+9Gv/BI/+4Bf+4Ef/XcP/LOP/TSf/RRP/WTv/JM/+3Ef+9Ff/bhf+5BP/DJf+yDv/imv/kqv/bXP/w0v/fd//calQXUgwAAAAKdFJOUwB///8d3L9enl8sr20gAAACN0lEQVRYw+2Y65abIBRGE1EzVbyNSW18/wctHA6XYw4q9Ee7Vt2AgOHbcVyTOMztdnFxcXFMWf7gKHN190VRKDpFC0iNqB5ZvqpXzJRxHoF7hrAa9/hK9j2oYIA2QA/UqXeyNg5QDBrshhHbUH8xxO+uT7sOJ/tU5a4wh0eK8KmKHTxd28Bfo16pqphep5l6I+R/p8xr668kVghVceH8M5EZYnGhnBKRceGqmaZXPPw2xbO+1xU+8axwe8NfzkIV7xVZdF0AVhi+rWdxIfgmwloE6CkrDCPwJbYUeFgK61icxFcNKyxIxE+WgnllQ0y4+HffzZ8WZtJlCDtz+CzqaaFaVGiWBNEOZZ15zihsT2CFnXk4QStsLohTU3FC+Af8I8JWV1fa1jy8u+hnOUy2vnd5SkeGrJBfHZwDbxe87pfxQvejmMZZYxxdYSoyVyixSvtXFLJ7hWq5xCRNSTozczzHCj8T54kI5d8QCtvZAodDIa7DgRkJaII2hBfaJC7EOE7D076XuIoVBu8oN3kpBLVt4YXBVaUSFSbS5Akb00znSoPn9KCJCN0am7SnGhganC4kKhR2MV0vvEn4M7bFhM3GIZqtgfiPr9BdSAYnrnCX3rQeB/2xsKcHouiBBhpO+phQL9CdjmKqsRkXpkMz57dmfTY1v3k8is26zvN2A6yIbKVqm/tMjFBMp5jpxrWKbsB1dJw/AsC3Lt/YEaK7x1t5r7aLj3ned/fRj1TK3H9wXFxc/F/8BgM0jBZ4nc19AAAAAElFTkSuQmCC"
                                 alt="folder" class="category u-file-icon u-file-icon--list">
                            <span class="nd-detail-filename__title-text inline-block-v-middle text-ellip">${folds[i]}</span>
                        `;
                        div.setAttribute('fold', folds[i]);
                        div.classList.add('nd-detail-filename');
                        div.style.cursor = 'pointer'; // 确保鼠标悬停时显示为可点击状态
                        div.addEventListener(clickName, function (e) {
                            if (currentPath) {
                                currentPath = `${currentPath}/${this.getAttribute('fold')}`
                            } else {
                                currentPath = this.getAttribute('fold')
                            }
                            game.saveConfig(skinSwitch.configKey.lastPreviewPath, currentPath)

                            // 清除搜索框内容，方便查看新目录内容
                            let searchInput = document.querySelector('#folderSearchInput');
                            if (searchInput) {
                                searchInput.value = '';
                            }

                            initFoldsInfo()
                            e.stopPropagation()
                        });
                        foldsEle.appendChild(div);
                    }
                    // 排序一下节点
                    let _sorts = document.getElementById('btnSortDirFiles')._sorts
                    if (_sorts != null) {
                        sortDirs(_sorts)
                    }

                    // 搜索框值更新后，保持文件夹筛选状态
                    let folderSearchInput = document.querySelector('#folderSearchInput');
                    if (folderSearchInput && folderSearchInput.value) {
                        folderSearchInput.dispatchEvent(new Event('input'));
                    }

                    for (let i = 1; i < foldsEle.children.length; i++) {
                        let foldName = foldsEle.children[i].getAttribute('fold')
                        if (lastDirName && lastDirName === foldName) {
                            foldsEle.children[i].classList.add('previewSelect')
                            // 计算滚动条, 滚动到对应的文件夹位置
                            if (i > 5) {
                                foldsEle.parentNode.scrollTop = 40 * (i - 5)
                            }
                        } else {
                            foldsEle.children[i].classList.remove('previewSelect')
                        }
                    }

                    // 点击文件夹时 初始化一下当前file
                    currentFoldInfo.curFiles.length = 0
                    currentFoldInfo.curFileIndex = -1

                    let retFiles = filterSpineFile(files)
                    for (let i = 0; i < retFiles.length; i++) {
                        let div = document.createElement('div')
                        div.innerHTML = `
                            <img
                                 src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAMAAAC5zwKfAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAABIUExURUxpcTOL+DSL+DqO+Veb/mKl/kmX+zWL+U6a+2ao/0aW+0CS+kyZ/GCk/mWn/1yi/lef/VGc/Pr9/+jz/2+s+46//b3a/4O3/AJIojgAAAAKdFJOUwDf//8d3U+en52O09RGAAACF0lEQVRYw+2Y63ajIBCAW8ZqHC5KrZv3f9MFhpuJTQfrjz1n/SDIbT4npw2pfXu7uLi4YNOP39O367rRvOKja/V9GHOqcTTmVGNnzLlGl6A2WvvWxGsqJo9ajKMuGP0dDcbxSWTShKlGfOOoebCNRTidYxynDXrb1dUU0ziGEF3ZdHHoza14xocMXzJyhLdpmme/e6ag2XeobqYCnBRvs98fm32meId56nnCErk+czfVhlub0CyfOyzaHhTa9XOX9aDQqnU/w7uyjULrcC3i+ocI4iUOVkQ7+8IVeptXWgUgMXD3xjv1UYCyCa6QUAiC0E64fMUBYBTOrUJnROmBryCEMEAsCbYKrSIkCSXS0LYLla8U6K4KSYi+H5ZsWmcJY1ohmpos3OLWmoSF9JajX9m8ckyIRfjIrzM8KERfq5J/yridZwrDx0HF6suOMF24QoXJGijCR/gZboB/TZgDYyd9lqU8mqGPlGQMJR8OfiDjZNjDEQ5S0hlDZ4ushWkqwxSWJCgezOKYIMsw7Ri4wi0g3HfBKuF55bBQTNod1WcKw9kv6yShTQgUQA6A6IsjAEmFJ4RXOF24W+gBcIUxAaiapChi/zolw5rfC+GYUKTqG1G11Vxo2Bn6AJLk8NiPC6JBKOjXLv0ZEruwN2AJe8GCnKzHgEGw4STonm/fub535rNUx8xx4D+RdsPP9Af+m3FxcfH/8hcLt2QJ3T9wuwAAAABJRU5ErkJggg=="
                                 class="category u-file-icon u-file-icon--list" alt="${retFiles[i].path}">
                            <span class="nd-detail-filename__title-text inline-block-v-middle text-ellip">${retFiles[i].path}</span>
                        `
                        div.setAttribute('path', retFiles[i].path)
                        div.setAttribute('data-skel-name', retFiles[i].name)
                        div.title = '左键预览，右键复制骨骼名称（无扩展名）；触屏长按可复制'
                        div.classList.add('nd-detail-filename')
                        div.addEventListener('contextmenu', function (e) {
                            e.preventDefault()
                            e.stopPropagation()
                            const skelName = this.getAttribute('data-skel-name')
                            if (skelName) previewClipboardCopy(skelName, '骨骼名称')
                        })
                        const BONE_LONG_MS = 500
                        div.addEventListener('touchstart', function () {
                            const el = this
                            el._boneLongPressCopy = false
                            if (el._boneLpTimer != null) clearTimeout(el._boneLpTimer)
                            el._boneLpTimer = setTimeout(function () {
                                el._boneLpTimer = null
                                const skelName = el.getAttribute('data-skel-name')
                                if (skelName) {
                                    el._boneLongPressCopy = true
                                    previewClipboardCopy(skelName, '骨骼名称')
                                }
                            }, BONE_LONG_MS)
                        }, { passive: true })
                        const boneLongClear = function () {
                            const el = this
                            if (el._boneLpTimer != null) {
                                clearTimeout(el._boneLpTimer)
                                el._boneLpTimer = null
                            }
                        }
                        div.addEventListener('touchend', boneLongClear)
                        div.addEventListener('touchcancel', boneLongClear)
                        div.addEventListener(clickName, function (e) {
                            if (this._boneLongPressCopy) {
                                this._boneLongPressCopy = false
                                e.stopPropagation()
                                return
                            }
                            if (lastSelFile === this) return

                            playSelectAsset(this.getAttribute('path'))

                            // 添加选择的样式
                            if (lastSelFile) {
                                lastSelFile.classList.remove('previewSelect')
                            }
                            lastSelFile = this
                            this.classList.add('previewSelect')

                            // 可能需要更新一下滚动条以及索引
                            for (let idx = 0; idx < this.parentNode.children.length; idx++) {
                                if (this === this.parentNode.children[idx]) {
                                    // 清理图集相关的信息
                                    currentFoldInfo.curFileIndex = idx
                                    if (window.location.hash === '#unique-id') {
                                        let scrollTop = filesEle.parentNode.scrollTop;
                                        if (scrollTop > (idx * 40)) {
                                            filesEle.parentNode.scrollTop = 40 * (idx - 3)
                                        } else if ((idx * 40 - scrollTop) > 10 * 40) {
                                            filesEle.parentNode.scrollTop = 40 * (idx)
                                        }
                                    }
                                    break
                                }
                            }

                            closeModalFunc()

                            // e.stopPropagation()
                        })
                        filesEle.appendChild(div)

                        currentFoldInfo.curFiles.push(div)
                        currentFoldInfo.curFileIndex = -1
                        closeModalFunc()
                    }
                }
                )
            }

            initFoldsInfo()

            let playSelectAsset = (path, opts) => {
                opts = opts || {}
                // 拼接当前所选择的文件, 获取版本号, 然后进行资源载入与播放
                let fullPath
                if (currentPath) {
                    fullPath = currentPath + '/' + path
                } else {
                    fullPath = path
                }
                pfqhUtils.getSpineFileVersion(fullPath, function (version) {
                    if (version == null) {
                        version = '3.6'
                    }
                    if ((!['3.5.35', '3.6', '3.7', '3.8', '4.0', '4.1', '4.2'].includes(version))) {
                        skinSwitchMessage.show({
                            'type': 'warning',
                            'text': `当前不支持${version}版本的骨骼文件播放`,
                            'duration': 1500
                        });
                        return;
                    }

                    // 加载当前骨骼
                    let dy = animationManager.getAnimation(version)

                    let name = path.substring(0, path.lastIndexOf("."))
                    let ext = path.substring(path.lastIndexOf(".") + 1)
                    let filename
                    if (currentPath) {
                        filename = currentPath + '/' + name
                    } else {
                        filename = name
                    }
                    let unpackCk = document.getElementById('unpackPremultipliedAlpha')
                    let unpackWant = !!(unpackCk && unpackCk.checked)
                    if (!isUpdate) {
                        dy.update({
                            width: decadeUI.get.bodySize().width,
                            height: decadeUI.get.bodySize().height,
                            dpr: Math.max(window.devicePixelRatio * (window.documentZoom ? window.documentZoom : 1), 1),
                            unpackPremultipliedAlpha: unpackWant,
                        })
                    } else {
                        dy.update({ unpackPremultipliedAlpha: unpackWant })
                    }

                    if (opts.forceReloadSpine && dy.hasSpine(filename)) {
                        let st = (ext && String(ext).toLowerCase() === 'json') ? 'json' : 'skel'
                        dy.removeSpine(filename, st)
                    }

                    let play = () => {
                        if (skinSwitch.nodePreviewedInfo[filename] === false) return
                        // 播放下一个之前, 保存上一个的node的数据
                        if (currentNode) {
                            skinSwitch.nodePreviewedInfo[currentNode.name] = Object.assign({
                                x: [0, x / canvas.width],
                                y: [0, y / canvas.height],
                                scale: currentNode.scale,
                                speed: currentNode.speed,
                                angle: currentNode.angle,
                                action: currentNode.skeleton.state.tracks[0].animation.name,
                                alpha: currentNode.premultipliedAlpha,
                                unpackPremultipliedAlpha: currentNode.unpackPremultipliedAlpha,
                            }, cloneSkinSwitchSlotStateForSave(currentNode))
                        }
                        animationManager.stopSpineAll()
                        let playInfo = {
                            x: [0, 0.65],
                            y: [0, 0.5],
                            name: filename,
                            scale: 0.5,
                            loop: true
                        }
                        let isPreviewed = false
                        if (filename in skinSwitch.nodePreviewedInfo) {
                            playInfo = Object.assign(playInfo, skinSwitch.nodePreviewedInfo[filename])
                            isPreviewed = true
                        }

                        let node = dy.playSpine(playInfo)
                        node._skinSwitchPreviewSpineVersion = version
                        skinSwitch._previewSpineDy = dy

                        let state = node.skeleton.state;
                        let activeAnimation = state.tracks[0].animation.name;

                        let checkHasDaiJi = (act) => {
                            // 自动寻找待机标签
                            const idleAction = ['idle', 'daiji', 'play', 'animation']
                            let res = false
                            for (let idle of idleAction) {
                                if (act.toLowerCase().indexOf(idle) !== -1) {
                                    res = true
                                    break
                                }
                            }
                            return res
                        }
                        if (!isPreviewed && !checkHasDaiJi(activeAnimation)) {
                            for (let i = 1; i < node.skeleton.data.animations.length; i++) {
                                let name = node.skeleton.data.animations[i].name
                                if (checkHasDaiJi(name)) {
                                    node.skeleton.state.setAnimation(0, name, true);
                                    node.skeleton.setToSetupPose();
                                    // 重新计算bounds
                                    (self.spineApplyWorldTransform ? self.spineApplyWorldTransform(node.skeleton, 0) : node.skeleton.updateWorldTransform());
                                    node.skeleton.bounds = { offset: new dy.spineLib.Vector2(), size: new dy.spineLib.Vector2() };
                                    node.skeleton.getBounds(node.skeleton.bounds.offset, node.skeleton.bounds.size, []);

                                    break
                                }
                            }
                        }

                        // 自动在屏幕中央
                        let autoFit = (t) => {
                            let canvasW = canvas.width
                            let canvasH = canvas.height
                            let bounds = t.skeleton.bounds
                            // 有些没有插槽, 就无法获取size, 返回默认的size
                            if (!Number.isFinite(t.skeleton.bounds.offset.x)) {
                                initCurrentNodeInfo()
                                return
                            }

                            let centerX = bounds.offset.x + bounds.size.x / 2;
                            let centerY = bounds.offset.y + bounds.size.y / 2;
                            let scaleX = bounds.size.x / canvasW;
                            let scaleY = bounds.size.y / canvasH;
                            let tempScale = Math.max(scaleX, scaleY);
                            tempScale = 1 / tempScale;

                            let width = canvasW / tempScale;
                            let height = canvasH / tempScale;

                            // 手动设置x和y值.
                            let xx = -(centerX - width / 2) / width
                            let yy = 1 - (centerY + height / 2) / height

                            if (tempScale < 1) {
                                t.scale = tempScale * height / width * 1.2
                            } else {
                                t.scale = tempScale * height / width / 1.2
                            }

                            if (bounds.size.x < bounds.size.y) {
                                t.scale = tempScale * height / width / 1.2
                            }

                            if (window.location.hash === '#unique-id') {
                                xx += 0.15
                            }

                            if (picPreviewBg.classList.contains('hidden')) {
                                yy -= 0.07
                            }

                            if (!document.getElementById('previewDetailInfo').classList.contains('hidden')) {
                                xx -= 0.1;
                            }

                            t.x = [0, xx];
                            t.y = [0, yy]

                            // 修改一些全局变量
                            document.getElementById('scale').value = t.scale
                            document.getElementById('posX').value = xx
                            document.getElementById('posY').value = yy
                            scaleSlider.value = t.scale
                            // 手动触发change事件
                            scaleSlider.dispatchEvent(new CustomEvent('input'))
                            x = xx * canvasW
                            y = yy * canvasH
                            scale = tempScale * 1.2
                            initCurrentNodeInfo()
                        }

                        document.getElementById('curVersionText').innerText = `当前版本: ${version}`
                        // 切换当前的骨骼
                        activeSkeleton = node.skeleton
                        currentNode = node
                        applySlotStateFromPlayInfoToNode(node, playInfo)
                        // 更新当前骨骼的标签信息
                        init()
                        applySkinSwitchPreviewSlotVisualToSkeleton(node)
                        if (!isPreviewed) {
                            autoFit(node)
                        } else {
                            // 修改一些全局变量
                            let xx = playInfo.x[1]
                            let yy = playInfo.y[1]
                            document.getElementById('scale').value = currentNode.scale
                            document.getElementById('posX').value = xx
                            document.getElementById('posY').value = yy
                            scaleSlider.value = currentNode.scale
                            // 手动触发change事件
                            scaleSlider.dispatchEvent(new CustomEvent('input'))
                            x = xx * canvas.width
                            y = yy * canvas.height
                            scale = playInfo.scale || 1
                            initCurrentNodeInfo()
                        }

                        // 生成缩略图
                        // setTimeout(() => {
                        //     canvas.toBlob(function(blob) {
                        //         let newImg = document.createElement("img")
                        //         previewWindow.appendChild(newImg);
                        //         let url = URL.createObjectURL(blob, 'image/webp', 0.01);
                        //         debugger
                        //
                        //         newImg.onload = function() {
                        //             // no longer need to read the blob so it's revoked
                        //             URL.revokeObjectURL(url);
                        //         }
                        //         newImg.src = url;
                        //         newImg.style.width = '100px'
                        //         newImg.style.height = '100px'
                        //         newImg.style.position = 'absolute'
                        //         newImg.style.top = '500px'
                        //
                        //     });
                        // }, 2000)
                    }

                    if (dy.hasSpine(filename)) {
                        play()
                    } else {
                        dy.loadSpine(filename, ext, () => {
                            play()
                        }, (err, err2) => {
                            console.log('加载骨骼错误', err, err2)
                            let errMsg = ''
                            if (err2 && err2.indexOf('atlas page image') !== -1) {
                                errMsg = '缺少切图'
                            }
                            skinSwitchMessage.show({
                                type: 'warning',
                                text: `加载${filename}错误 ${errMsg}`
                            })
                            skinSwitch.nodePreviewedInfo[filename] = false
                        })
                    }

                }, function () {
                    skinSwitchMessage.show({
                        'type': 'warning',
                        'text': `获取版本号错误`,
                        'duration': 1500
                    })
                })

            }

            let scaleSlider
            {
                scaleSlider = document.createElement('input')
                scaleSlider.min = '0'
                scaleSlider.max = '3'
                scaleSlider.value = '0.5'
                scaleSlider.type = 'range';

                // scaleSlider = decadeUI.component.slider(0.1, 3, 0.5)
                scaleSlider.setAttribute('step', '0.01')
                let scaleNode = document.getElementById('scale')
                scaleNode.parentNode.insertBefore(scaleSlider, scaleNode)
            }

            let speedSlider
            {
                speedSlider = document.createElement('input')
                speedSlider.min = '0'
                speedSlider.max = '4'
                speedSlider.type = 'range';
                // speedSlider = decadeUI.component.slider(0, 3, 1)
                speedSlider.setAttribute('step', '0.1')

                let con = document.createElement('span')
                let speedText = document.createElement('span')
                speedText.innerHTML = '速度: 1'
                speedSlider.value = '1'
                con.appendChild(speedText)
                con.appendChild(speedSlider)

                let closePreviewWindow = document.getElementById('closePreviewWindow')
                closePreviewWindow.parentNode.insertBefore(con, closePreviewWindow)

                speedSlider.onchange = function () {
                    if (currentNode) {
                        currentNode.speed = speedSlider.value
                    }
                    speedText.innerHTML = '速度: ' + speedSlider.value
                };

            }
            // 将会包装事件的 debounce 函数
            function debounce(fn, delay) {
                // 维护一个 timer
                let timer = null;

                return function () {
                    // 通过 'this' 和 'arguments' 获取函数的作用域和变量
                    let context = this;
                    let args = arguments;

                    clearTimeout(timer);
                    timer = setTimeout(function () {
                        fn.apply(context, args);
                    }, delay);
                }
            }

            let thunderForbidTouch = function () {
                _status.th_swipe_up = lib.config.swipe_up;
                lib.config.swipe_up = ''
                _status.th_swipe_down = lib.config.swipe_down;
                lib.config.swipe_down = ''
                _status.th_swipe_left = lib.config.swipe_left;
                lib.config.swipe_left = ''
                _status.th_swipe_right = lib.config.swipe_right;
                lib.config.swipe_right = ''
                _status.th_gamePause = ui.click.pause
                ui.click.pause = () => { }
            }

            let thunderAllowTouch = function () {
                if (_status.th_swipe_up) {
                    lib.config.swipe_up = _status.th_swipe_up
                    lib.config.swipe_down = _status.th_swipe_down
                    lib.config.swipe_left = _status.th_swipe_left
                    lib.config.swipe_right = _status.th_swipe_right
                    ui.click.pause = _status.th_gamePause
                }
            }

            thunderForbidTouch()

            // 拨动动画时长, 跳转到某刻 https://juejin.cn/post/7125409030113067015
            let timeSlider
            {
                timeSlider = document.createElement('input')
                timeSlider.min = '0'
                timeSlider.max = '1'
                // timeSlider = decadeUI.component.slider(0, 1, 0)
                timeSlider.setAttribute('step', '0.01')
                timeSlider.type = 'range';

                let con = document.createElement('span')
                let text = document.createElement('span')
                text.innerHTML = '进度: 0.00'
                timeSlider.value = '0'
                con.appendChild(text)
                con.appendChild(timeSlider)

                let closePreviewWindow = document.getElementById('closePreviewWindow')
                closePreviewWindow.parentNode.insertBefore(con, scaleSlider.parentNode)

                timeSlider.addEventListener('input', debounce(function (e) {
                    text.innerHTML = `进度: ${Number(timeSlider.value).toFixed(2)}`

                    // 修改speed为0, 并且跳转到具体的时间
                    speedSlider.value = 0
                    speedSlider.onchange()

                    if (currentNode) {
                        currentNode.speed = speedSlider.value
                        let state = activeSkeleton.state
                        let entry = state.tracks[0]
                        entry.trackTime = Number(timeSlider.value) * entry.animationEnd
                    }


                }, 10))
            }

            let angleSlider
            {
                angleSlider = document.createElement('input')
                angleSlider.min = '0'
                angleSlider.max = '360'
                angleSlider.type = 'range'
                // angleSlider = decadeUI.component.slider(0, 360, 0)
                angleSlider.setAttribute('step', '1')

                let con = document.createElement('span')
                let text = document.createElement('span')
                text.innerHTML = '角度: 0°'
                angleSlider.value = '0'
                con.appendChild(text)
                con.appendChild(angleSlider)

                let closePreviewWindow = document.getElementById('closePreviewWindow')
                closePreviewWindow.parentNode.insertBefore(con, scaleSlider.parentNode)

                angleSlider.onchange = function () {
                    text.innerHTML = '角度: ' + angleSlider.value + '°'
                    if (currentNode) {
                        currentNode.angle = angleSlider.value
                    }
                };

            }

            /* ********** 图集模式相关的定义 开始 **********/
            const picPreviewModeBtn = document.createElement('button')
            picPreviewModeBtn.classList.add('closeBtn')
            picPreviewModeBtn.style.marginLeft = '10px'
            picPreviewModeBtn.innerText = '图集模式'
            let closePreviewWindow = document.getElementById('closePreviewWindow')
            closePreviewWindow.parentNode.insertBefore(picPreviewModeBtn, closePreviewWindow)

            const closeImgPreview = document.getElementById('closeImgPreview')
            const picPreviewBg = document.getElementById('picPreviewBg')

            const previewImgModal = document.getElementById('previewImgModal')
            const modalItemsList = document.getElementById('modalItemsList')
            const modalClose = document.getElementById('closeModal')
            // 滑动条
            const dataProgressBar = document.getElementById('dataProgressBar')
            const previewOperateSpeedCtrl = document.getElementById('previewOperateSpeedCtrl')

            // 详情
            const previewDetailInfo = document.getElementById('previewDetailInfo')
            const previewInfoHideMenu = document.getElementById('previewInfoHideMenu')  // 隐藏按钮

            const operateBtn = {
                left: document.getElementById('previewOperateLeft'),
                right: document.getElementById('previewOperateRight'),
                switchAction: document.getElementById('previewOperateQieHuan'),  // 快速切换标签
                scaleAdd: document.getElementById('previewOperateFangda'),
                scaleSub: document.getElementById('previewOperateSuoxiao'),
                AngleAdd: document.getElementById('previewOperateNizhuan'),
                alpha: document.getElementById('previewOperateAlpha'),
                action: document.getElementById('previewOperateDonghuaAction'),
                skin: document.getElementById('previewOperatePifu'),
                boneSlots: document.getElementById('previewOperateBoneSlots'),
                speed: document.getElementById('previewOperateSpeed'),
                info: document.getElementById('previewOperateInfo'),
                close: document.getElementById('previewOperateClose'),
            }

            document.getElementById('opFoldTree').listen(() => {
                if (window.location.hash !== '#unique-id') {
                    document.getElementById('foldTreeAbtn').click()
                    setTimeout(() => {
                        if (lastSelFile) {
                            for (let idx = 0; idx < filesEle.children.length; idx++) {
                                if (lastSelFile === filesEle.children[idx]) {
                                    if (idx > 5) {
                                        filesEle.parentNode.scrollTop = 40 * (idx - 5)
                                    }
                                    break
                                }
                            }
                        }
                    }, 100)
                } else {
                    document.getElementById('closeTreeModal').click()
                }
            })

            picPreviewModeBtn.addEventListener(lib.config.touchscreen ? 'touchend' : 'click', function () {
                // 隐藏原来的按钮, 进入图集模式
                picPreviewBg.classList.remove('hidden')
                previewSpineDom.classList.add('hidden')

            })

            closeImgPreview.addEventListener(lib.config.touchscreen ? 'touchend' : 'click', function () {
                picPreviewBg.classList.add('hidden')
                previewSpineDom.classList.remove('hidden')
                previewOperateSpeedCtrl.classList.add('hidden')
            })

            operateBtn.left.listen((e) => {
                let len = currentFoldInfo.curFiles.length
                if (len === 0) return
                if (currentFoldInfo.curFileIndex === -1) currentFoldInfo.curFileIndex = 0
                else {
                    if (len === 1) return
                    if (currentFoldInfo.curFileIndex === 0) currentFoldInfo.curFileIndex = len - 1
                    else currentFoldInfo.curFileIndex--
                }
                currentFoldInfo.curFiles[currentFoldInfo.curFileIndex].dispatchEvent(new CustomEvent(lib.config.touchscreen ? 'touchend' : 'click'))
                // 关闭标签预览页
                closeModalFunc()
            })

            operateBtn.right.listen((e) => {
                let len = currentFoldInfo.curFiles.length
                if (len === 0) return
                if (currentFoldInfo.curFileIndex === -1) currentFoldInfo.curFileIndex = 0
                else {
                    if (len === 1) return
                    if (currentFoldInfo.curFileIndex === len - 1) currentFoldInfo.curFileIndex = 0
                    else currentFoldInfo.curFileIndex++
                }
                currentFoldInfo.curFiles[currentFoldInfo.curFileIndex].dispatchEvent(new CustomEvent(lib.config.touchscreen ? 'touchend' : 'click'))

                closeModalFunc()
            })

            operateBtn.switchAction.listen(() => {
                if (currentNode == null) return
                closeModalFunc()
                // 获取当前角色
                let skeleton = activeSkeleton
                let state = skeleton.state;
                if (skeleton.data.animations.length <= 1) return
                let activeAnimation = state.tracks[0].animation.name;
                let findIndex = 0
                for (let i = 0; i < skeleton.data.animations.length; i++) {
                    if (activeAnimation === skeleton.data.animations[i].name) {
                        findIndex = i
                        break
                    }
                }

                if (findIndex === skeleton.data.animations.length - 1) {
                    findIndex = 0
                } else {
                    findIndex++
                }
                state.setAnimationWith(0, skeleton.data.animations[findIndex], true)
                skeleton.setToSetupPose();

                initCurrentNodeInfo()

            })

            skinSwitch.continuousClick(operateBtn.scaleAdd, () => {
                if (!currentNode) return
                currentNode.scale = (Number(currentNode.scale) || 1) + 0.02
                initCurrentNodeInfo(4)
            })

            skinSwitch.continuousClick(operateBtn.scaleSub, () => {
                if (!currentNode) return
                let s = (Number(currentNode.scale) || 1) - 0.02
                if (s <= 0.01) s = 0.01
                currentNode.scale = s

                initCurrentNodeInfo(4)
            })

            skinSwitch.continuousClick(operateBtn.AngleAdd, () => {
                if (!currentNode) return
                currentNode.angle = (Number(currentNode.angle) || 0) + 30
            })

            operateBtn.alpha.listen(function (e) {
                let premultipliedAlpha = document.getElementById('premultipliedAlpha')
                let isSelect = premultipliedAlpha.checked
                if (isSelect) {
                    this.classList.remove('alphaSelect')
                } else {
                    this.classList.add('alphaSelect')
                }
                currentNode.premultipliedAlpha = !isSelect
                premultipliedAlpha.checked = !premultipliedAlpha.checked
                persistPreviewNodeAlpha()
            })

            operateBtn.speed.listen(function (e) {
                previewOperateSpeedCtrl.classList.remove('hidden')
                const maxSpeed = 4
                if (currentNode) {
                    let curSpeed = currentNode.speed == null ? 1 : currentNode.speed
                    if (curSpeed >= maxSpeed) curSpeed = maxSpeed
                    else if (curSpeed <= 0) curSpeed = 0
                    let percent = curSpeed / maxSpeed
                    progressData.progressBarText.innerText = curSpeed.toFixed(1)
                    progressData.progressBarWrap.style.transform = `scaleY(${percent})`
                    progressData.progressBarThumb.style.transform = `translateY(-${percent * 78}px)`
                }
                closeModalFunc()

            })

            operateBtn.skin.listen(function (e) {
                if (currentNode == null) return

                if (!previewImgModal.classList.contains('hidden')) {
                    if (document.getElementById('previewModalTitle').innerText === '骨骼皮肤') {
                        closeModalFunc()
                        return
                    }
                }

                // 获取当前角色
                let skeleton = activeSkeleton;
                let activeSkin = skeleton.skin.name
                let skinsList = []
                for (let i = 0; i < skeleton.data.skins.length; i++) {
                    skinsList.push(skeleton.data.skins[i].name)
                }
                document.getElementById('previewModalTitle').innerText = '骨骼皮肤'
                initItemsModal(skinsList, activeSkin, (skinName) => {
                    if (!activeSkeleton) return
                    let skeleton = activeSkeleton

                    try {
                        skeleton.setSkinByName(skinName);
                        skeleton.setSlotsToSetupPose();
                    } catch (e) {
                        console.warn('Failed to set skin:', skinName, e);
                        // 如果设置指定皮肤失败，尝试使用默认皮肤
                        if (skeleton.data.defaultSkin) {
                            try {
                                skeleton.setSkin(skeleton.data.defaultSkin);
                                skeleton.setSlotsToSetupPose();
                            } catch (e2) {
                                console.warn('Failed to set default skin:', e2);
                            }
                        }
                    }

                    initCurrentNodeInfo()
                })
            })

            operateBtn.action.listen((e) => {
                if (currentNode == null) return

                if (!previewImgModal.classList.contains('hidden')) {
                    if (document.getElementById('previewModalTitle').innerText === '骨骼标签') {
                        closeModalFunc()
                        return
                    }
                }
                // 获取当前角色
                let skeleton = activeSkeleton
                let state = skeleton.state;
                let activeAnimation = state.tracks[0].animation.name;
                let aniList = []
                for (let i = 0; i < skeleton.data.animations.length; i++) {
                    aniList.push(skeleton.data.animations[i].name)
                }
                document.getElementById('previewModalTitle').innerText = '骨骼标签'

                initItemsModal(aniList, activeAnimation, (animationName) => {
                    if (!activeSkeleton) return
                    let skeleton = activeSkeleton
                    let state = skeleton.state;
                    state.setAnimation(0, animationName, true);
                    skeleton.setToSetupPose();

                    initCurrentNodeInfo()
                })
            })

            operateBtn.boneSlots.listen((e) => {
                if (currentNode == null) return

                if (!previewImgModal.classList.contains('hidden')) {
                    if (document.getElementById('previewModalTitle').innerText === '骨骼部件') {
                        closeModalFunc()
                        return
                    }
                }

                let skeleton = activeSkeleton
                let slotsList = []
                let slotsVisibility = {}
                let slotsAlpha = {}

                if (!currentNode._skinSwitchPreviewHiddenSlots) currentNode._skinSwitchPreviewHiddenSlots = new Set()
                if (!currentNode._skinSwitchPreviewSlotAlphas) currentNode._skinSwitchPreviewSlotAlphas = new Map()

                for (let i = 0; i < skeleton.slots.length; i++) {
                    let slot = skeleton.slots[i]
                    let slotName = slot.data.name
                    slotsList.push(slotName)
                    slotsVisibility[slotName] = !currentNode._skinSwitchPreviewHiddenSlots.has(slotName)
                    let a = 1
                    if (currentNode._skinSwitchPreviewSlotAlphas.has(slotName)) {
                        a = currentNode._skinSwitchPreviewSlotAlphas.get(slotName)
                    } else if (slot.color && typeof slot.color.a === 'number') {
                        a = slot.color.a
                    }
                    slotsAlpha[slotName] = a
                }

                document.getElementById('previewModalTitle').innerText = '骨骼部件'

                initSlotsModal(slotsList, slotsVisibility, slotsAlpha, (slotName, isVisible) => {
                    if (!activeSkeleton || !currentNode) return
                    if (!currentNode._skinSwitchPreviewHiddenSlots) currentNode._skinSwitchPreviewHiddenSlots = new Set()
                    let sk = activeSkeleton
                    let targetSlot = sk.findSlot(slotName)
                    if (!targetSlot) return
                    if (isVisible) {
                        currentNode._skinSwitchPreviewHiddenSlots.delete(slotName)
                        let attachmentName = targetSlot.data.attachmentName
                        if (attachmentName) {
                            targetSlot.setAttachment(sk.getAttachment(targetSlot.data.index, attachmentName))
                        }
                    } else {
                        currentNode._skinSwitchPreviewHiddenSlots.add(slotName)
                        targetSlot.setAttachment(null)
                    }
                })
            })

            operateBtn.info.listen(function (e) {
                let isHidden = previewDetailInfo.classList.contains('hidden')
                if (isHidden) {
                    previewDetailInfo.classList.remove('hidden')
                    // 修改样式
                    document.getElementById('previewContainer').style.width = '80%'
                    document.getElementById('preview-operate').style.width = '80%'
                    initCurrentNodeInfo()
                } else {
                    // 关闭.
                    closeNodeInfo()
                }

            })

            // 底部关闭按钮事件
            operateBtn.close.listen(function (e) {
                picPreviewBg.classList.add('hidden')
                previewSpineDom.classList.remove('hidden')
                previewOperateSpeedCtrl.classList.add('hidden')
                // 如果详情面板是打开的，也要关闭
                if (!previewDetailInfo.classList.contains('hidden')) {
                    closeNodeInfo()
                }
            })

            previewInfoHideMenu.listen(function (e) {
                closeNodeInfo()
            })

            // 初始化当前节点的基本信息
            const initCurrentNodeInfo = (index) => {
                // 获取各个节点
                let contentNodes = previewDetailInfo.getElementsByClassName('content')
                let currentAni = currentNode.skeleton.state.tracks[0].animation
                if (currentNode) {
                    if (index == null) {
                        contentNodes[0].innerText = lastSelFile.getAttribute('path')
                        contentNodes[1].innerText = document.getElementById('curVersionText').innerText
                        contentNodes[2].innerText = currentAni.duration.toFixed(1)
                        contentNodes[3].innerText = `标签: ${currentAni.name}, 皮肤: ${currentNode.skeleton.skin.name}`
                        let speed
                        if (currentNode.speed == null) {
                            speed = 1.0
                        } else {
                            speed = Number(currentNode.speed).toFixed(1)
                        }
                        contentNodes[4].innerText = `大小: ${Number(currentNode.scale).toFixed(2)}, 速度: ${speed}`
                    } else {
                        switch (index) {
                            case 0:
                                contentNodes[0].innerText = lastSelFile.getAttribute('path')
                                break
                            case 1:
                                contentNodes[1].innerText = document.getElementById('curVersionText').innerText
                                break
                            case 2:
                                contentNodes[2].innerText = currentAni.duration.toFixed(1)
                                break
                            case 3:
                                contentNodes[3].innerText = `标签: ${currentAni.name}, 皮肤: ${currentNode.skeleton.skin.name}`
                                break
                            case 4:
                                let speed
                                if (currentNode.speed == null) {
                                    speed = 1.0
                                } else {
                                    speed = Number(currentNode.speed).toFixed(1)
                                }
                                contentNodes[4].innerText = `大小: ${Number(currentNode.scale).toFixed(2)}, 速度: ${speed}`
                                break
                        }
                    }

                }
            }

            const closeNodeInfo = () => {
                document.getElementById('previewContainer').style.width = '100%'
                document.getElementById('preview-operate').style.width = '100%'
                previewDetailInfo.classList.add('hidden')
            }

            // 调节速度的滚动条事件
            let progressData = {
                isDown: false,
                posY: 0,
                progressBarText: dataProgressBar.previousElementSibling,
                progressBarWrap: dataProgressBar.getElementsByClassName('bui-bar-normal')[0],
                progressBarThumb: dataProgressBar.getElementsByClassName('bui-thumb')[0],

            }
            dataProgressBar.addEventListener(lib.config.touchscreen ? 'touchstart' : 'mousedown', function (e) {
                e.stopPropagation()
                progressData.isDown = true
                picPreviewBg.isTouching = false
                if (e.touches && e.touches.length) {
                    progressData.posY = e.touches[0].clientY
                } else {
                    progressData.posY = e.clientY
                }
            })
            picPreviewBg.addEventListener(lib.config.touchscreen ? 'touchstart' : 'mousedown', function (e) {
                if (!progressData.isDown) {
                    previewOperateSpeedCtrl.classList.add('hidden')
                }
            })

            picPreviewBg.addEventListener(lib.config.touchscreen ? 'touchmove' : 'mousemove', function (e) {
                if (!progressData.isDown) return
                let deltaY, curY
                if (e.touches && e.touches.length) {
                    curY = e.touches[0].clientY
                } else {
                    curY = e.clientY
                }
                deltaY = curY - progressData.posY
                const maxSpeed = 4
                if (currentNode) {
                    let curSpeed = currentNode.speed == null ? 1 : currentNode.speed
                    curSpeed = -deltaY / 60 * 4 + curSpeed
                    if (curSpeed >= maxSpeed) curSpeed = maxSpeed
                    else if (curSpeed <= 0) curSpeed = 0
                    let percent = curSpeed / maxSpeed
                    progressData.progressBarText.innerText = curSpeed.toFixed(1)
                    progressData.progressBarWrap.style.transform = `scaleY(${percent})`
                    progressData.progressBarThumb.style.transform = `translateY(-${percent * 78}px)`

                    currentNode.speed = curSpeed
                }
                progressData.posY = curY
            })

            picPreviewBg.addEventListener(lib.config.touchscreen ? 'touchend' : 'mouseup', function (e) {
                if (progressData.isDown) {
                    initCurrentNodeInfo(4)
                }
                progressData.isDown = false

            })

            picPreviewBg.addEventListener(lib.config.touchscreen ? 'touchcancel' : 'mouseleave', function (e) {
                progressData.isDown = false
            })

            modalClose.listen(() => {
                closeModalFunc()
            })

            // 新的双指放大缩小与滑动功能
            function mouseupEvent(event) {
                picPreviewBg._mouseup(event);
            }
            function mousemoveEvent(event) {
                if (event) {
                    if (event.touches && event.touches.length) {
                        picPreviewBg._mousemove(event.touches[0].clientX, event.touches[0].clientY);
                    }
                    else picPreviewBg._mousemove(event.clientX, event.clientY);
                }
            }
            function mousedownEvent(event) {
                if (event) {
                    // 清空之前的数据
                    if (this.posX) delete this.posX
                    if (this.posY) delete this.posY
                    if (event.touches && event.touches.length) picPreviewBg._mousedown(event.touches[0].clientX, event.touches[0].clientY);
                    else picPreviewBg._mousedown(event.clientX, event.clientY);
                }
            }
            picPreviewBg._mousedown = function (x, y) {
                this.posX = x
                this.posY = y
                this.isTouching = true
            }
            picPreviewBg._mousemove = function (clientX, clientY) {
                if (!this.isTouching) return;
                let deltaX = clientX - this.posX;
                let deltaY = clientY - this.posY;
                x += deltaX
                y -= deltaY
                let vx = x / canvas.width
                let vy = y / canvas.height

                if (currentNode) {
                    currentNode.x = [0, vx]
                    currentNode.y = [0, vy]
                }
                this.posX = clientX
                this.posY = clientY
            }
            picPreviewBg._mouseup = function (event) {
                this.isTouching = false;
                delete this.posX;
                delete this.posY;
            }
            picPreviewBg.addEventListener('touchstart', mousedownEvent, true);
            picPreviewBg.addEventListener('touchend', mouseupEvent, true);
            picPreviewBg.addEventListener('touchcancel', mouseupEvent, true);
            picPreviewBg.addEventListener('touchmove', mousemoveEvent, true);
            picPreviewBg.addEventListener('mousedown', mousedownEvent, true);
            picPreviewBg.addEventListener('mouseup', mouseupEvent, true);
            picPreviewBg.addEventListener('mouseleave', mouseupEvent, true);
            picPreviewBg.addEventListener('mousemove', mousemoveEvent, true);

            // 监听图集事件的滚轮缩放事件
            picPreviewBg.addEventListener('wheel', debounce(function (e) {
                let ratio = 0.05;
                // 缩小

                let scale = Number(scaleSlider.value)

                if (e.deltaY > 0) {
                    ratio = -0.05;
                }
                scale = scale + ratio;
                // 限制缩放倍数
                if (scale < 0.05) scale = 0.05
                scaleSlider.value = scale.toString()
                // 手动触发change事件
                if (currentNode) {
                    currentNode.scale = scaleSlider.value
                }
                document.getElementById('scale').value = scaleSlider.value;
                initCurrentNodeInfo(4)
                // e.preventDefault();
            }, 0))


            const closeModalFunc = () => {
                previewImgModal.classList.add('hidden')
                previewImgModal.classList.remove('slots-inspector-mode')
                modalItemsList.innerHTML = '' // 清空数据
            }

            const initItemsModal = (itemList, selectItem, func) => {
                previewImgModal.classList.remove('hidden')
                previewImgModal.classList.remove('slots-inspector-mode')
                modalItemsList.innerHTML = ''

                // 阻止模态框内的滚动事件传播到背景
                let listContainer = previewImgModal.querySelector('.list-container')

                listContainer.addEventListener('wheel', function (e) {
                    e.stopPropagation()
                })

                listContainer.addEventListener('touchmove', function (e) {
                    e.stopPropagation()
                })

                modalItemsList.addEventListener('wheel', function (e) {
                    e.stopPropagation()
                })

                modalItemsList.addEventListener('touchmove', function (e) {
                    e.stopPropagation()
                })

                itemList.forEach(item => {
                    let it = document.createElement('div')
                    it.classList.add('actionItemTagOuter')
                    it.innerHTML = `<span class="actionItemTag"><i class="iconfont icon-collect actionItemTagIcon" ></i>${item}</span>`
                    modalItemsList.appendChild(it)
                    it.setAttribute('value', item)

                    if (selectItem === item) {
                        it.getElementsByTagName('span')[0].classList.add('selectItemTag')
                    }
                    it.listen(function (e) {
                        skinSwitch.refreshDomList(
                            Array.from(modalItemsList.children).map(v => v.getElementsByTagName('span')[0]),
                            'selectItemTag',
                            this.getElementsByTagName('span')[0]
                        )
                        func(this.getAttribute('value'))
                    })
                })
            }

            const initSlotsModal = (slotsList, slotsVisibility, slotsAlpha, func) => {
                previewImgModal.classList.remove('hidden')
                previewImgModal.classList.add('slots-inspector-mode')
                modalItemsList.innerHTML = ''

                let listContainer = previewImgModal.querySelector('.list-container')

                listContainer.addEventListener('wheel', function (e) {
                    e.stopPropagation()
                })

                listContainer.addEventListener('touchmove', function (e) {
                    e.stopPropagation()
                })

                modalItemsList.addEventListener('wheel', function (e) {
                    e.stopPropagation()
                })

                modalItemsList.addEventListener('touchmove', function (e) {
                    e.stopPropagation()
                })

                slotsList.forEach((slotName) => {
                    let row = document.createElement('div')
                    row.classList.add('slotInspectorRow')

                    let isVisible = slotsVisibility[slotName]
                    let eyeWrap = document.createElement('div')
                    eyeWrap.classList.add('slotInspectorEye', isVisible ? 'slot-on' : 'slot-off')
                    eyeWrap.setAttribute('data-slot', slotName)
                    eyeWrap.setAttribute('data-visible', isVisible ? 'true' : 'false')
                    eyeWrap.innerHTML = `<i class="iconfont ${isVisible ? 'icon-eye' : 'icon-eye-close'}"></i>`

                    let nameEl = document.createElement('div')
                    nameEl.classList.add('slotInspectorName')
                    nameEl.textContent = slotName
                    nameEl.title = slotName + '（双击或右键复制；触屏长按复制）'

                    let right = document.createElement('div')
                    right.classList.add('slotInspectorRight')
                    let stepDown = document.createElement('button')
                    stepDown.type = 'button'
                    stepDown.classList.add('slotInspectorStepBtn')
                    stepDown.setAttribute('aria-label', '透明度减1')
                    stepDown.textContent = '−'
                    let alphaInput = document.createElement('input')
                    alphaInput.type = 'text'
                    alphaInput.classList.add('slotInspectorAlphaPctInput')
                    alphaInput.setAttribute('inputmode', 'numeric')
                    alphaInput.setAttribute('autocomplete', 'off')
                    alphaInput.title = '透明度 0–100%，± 每次 1，失焦或回车生效'
                    let initA = slotsAlpha[slotName]
                    if (typeof initA !== 'number' || initA < 0) initA = 1
                    if (initA > 1) initA = 1
                    alphaInput.value = String(Math.round(initA * 100))
                    let stepUp = document.createElement('button')
                    stepUp.type = 'button'
                    stepUp.classList.add('slotInspectorStepBtn')
                    stepUp.setAttribute('aria-label', '透明度加1')
                    stepUp.textContent = '+'
                    let alphaPctSuffix = document.createElement('span')
                    alphaPctSuffix.classList.add('slotInspectorPctSuffix')
                    alphaPctSuffix.textContent = '%'
                    right.appendChild(stepDown)
                    right.appendChild(alphaInput)
                    right.appendChild(stepUp)
                    right.appendChild(alphaPctSuffix)

                    row.appendChild(eyeWrap)
                    row.appendChild(nameEl)
                    row.appendChild(right)
                    modalItemsList.appendChild(row)

                    let setEyeUi = (vis) => {
                        eyeWrap.setAttribute('data-visible', vis ? 'true' : 'false')
                        eyeWrap.classList.toggle('slot-on', vis)
                        eyeWrap.classList.toggle('slot-off', !vis)
                        let ic = eyeWrap.querySelector('i')
                        if (ic) {
                            ic.className = 'iconfont ' + (vis ? 'icon-eye' : 'icon-eye-close')
                        }
                    }

                    let applySlotAlpha = () => {
                        if (!currentNode) return
                        if (!currentNode._skinSwitchPreviewSlotAlphas) currentNode._skinSwitchPreviewSlotAlphas = new Map()
                        let v = parseInt(String(alphaInput.value).trim(), 10)
                        if (isNaN(v)) v = 100
                        v = Math.max(0, Math.min(100, v))
                        alphaInput.value = String(v)
                        let a = v / 100
                        if (a >= 0.999) currentNode._skinSwitchPreviewSlotAlphas.delete(slotName)
                        else currentNode._skinSwitchPreviewSlotAlphas.set(slotName, a)
                        let sk = activeSkeleton
                        if (sk) {
                            let targetSlot = sk.findSlot(slotName)
                            if (targetSlot && targetSlot.color) targetSlot.color.a = a
                        }
                        if (a > 0.02 && currentNode._skinSwitchPreviewHiddenSlots && currentNode._skinSwitchPreviewHiddenSlots.has(slotName)) {
                            currentNode._skinSwitchPreviewHiddenSlots.delete(slotName)
                            let sl = activeSkeleton && activeSkeleton.findSlot(slotName)
                            if (sl && activeSkeleton && !sl.attachment && sl.data.attachmentName) {
                                sl.setAttachment(activeSkeleton.getAttachment(sl.data.index, sl.data.attachmentName))
                            }
                            setEyeUi(true)
                        }
                        persistPreviewNodeAlpha()
                    }
                    let bumpAlphaPct = function (delta) {
                        let v = parseInt(String(alphaInput.value).trim(), 10)
                        if (isNaN(v)) v = 100
                        v = Math.max(0, Math.min(100, v + delta))
                        alphaInput.value = String(v)
                        applySlotAlpha()
                    }
                    let bindSlotAlphaStepHold = function (btn, delta) {
                        let holdTimer = null
                        let downEvent = lib.config.touchscreen ? 'touchstart' : 'mousedown'
                        let upEvent = lib.config.touchscreen ? 'touchend' : 'mouseup'
                        let cancelEvent = lib.config.touchscreen ? 'touchcancel' : 'mouseleave'
                        let windowEndHold = null
                        function holdUp() {
                            if (holdTimer != null) {
                                clearInterval(holdTimer)
                                holdTimer = null
                            }
                            if (windowEndHold) {
                                window.removeEventListener('mouseup', windowEndHold, true)
                                window.removeEventListener('touchend', windowEndHold, true)
                                window.removeEventListener('touchcancel', windowEndHold, true)
                                windowEndHold = null
                            }
                        }
                        function onDown(e) {
                            e.preventDefault()
                            e.stopPropagation()
                            holdUp()
                            bumpAlphaPct(delta)
                            holdTimer = setInterval(function () {
                                bumpAlphaPct(delta)
                            }, 120)
                            windowEndHold = function () {
                                holdUp()
                            }
                            window.addEventListener('mouseup', windowEndHold, true)
                            window.addEventListener('touchend', windowEndHold, true)
                            window.addEventListener('touchcancel', windowEndHold, true)
                        }
                        function onUp(e) {
                            if (e) e.stopPropagation()
                            holdUp()
                        }
                        btn.addEventListener(downEvent, onDown)
                        btn.addEventListener(upEvent, onUp)
                        btn.addEventListener(cancelEvent, onUp)
                    }
                    bindSlotAlphaStepHold(stepDown, -1)
                    bindSlotAlphaStepHold(stepUp, 1)
                    alphaInput.addEventListener('blur', applySlotAlpha)
                    alphaInput.addEventListener('keydown', function (ev) {
                        if (ev.key === 'Enter') {
                            ev.preventDefault()
                            applySlotAlpha()
                        }
                    })
                    alphaInput.addEventListener('wheel', function (e) {
                        e.preventDefault()
                    }, { passive: false })
                    alphaInput.addEventListener('mousedown', function (e) { e.stopPropagation() })
                    alphaInput.addEventListener('touchstart', function (e) { e.stopPropagation() }, { passive: true })
                    alphaInput.addEventListener('click', function (e) { e.stopPropagation() })

                    let clickCount = 0
                    let clickTimer = null
                    nameEl.addEventListener('click', function () {
                        clickCount++
                        if (clickCount === 2) {
                            clearTimeout(clickTimer)
                            clickCount = 0
                            previewClipboardCopy(slotName, '部件名称')
                            return
                        }
                        clickTimer = setTimeout(() => { clickCount = 0 }, 320)
                    })
                    nameEl.addEventListener('contextmenu', function (e) {
                        e.preventDefault()
                        previewClipboardCopy(slotName, '部件名称')
                    })
                    const PART_LONG_MS = 500
                    nameEl.addEventListener('touchstart', function () {
                        const el = this
                        el._partLongCopy = false
                        if (el._partLpTimer != null) clearTimeout(el._partLpTimer)
                        el._partLpTimer = setTimeout(function () {
                            el._partLpTimer = null
                            el._partLongCopy = true
                            previewClipboardCopy(slotName, '部件名称')
                        }, PART_LONG_MS)
                    }, { passive: true })
                    const partLongClear = function () {
                        const el = this
                        if (el._partLpTimer != null) {
                            clearTimeout(el._partLpTimer)
                            el._partLpTimer = null
                        }
                    }
                    nameEl.addEventListener('touchend', partLongClear)
                    nameEl.addEventListener('touchcancel', partLongClear)

                    eyeWrap.listen(function () {
                        let currentVisible = eyeWrap.getAttribute('data-visible') === 'true'
                        let newVisible = !currentVisible
                        setEyeUi(newVisible)
                        func(slotName, newVisible)
                        persistPreviewNodeAlpha()
                    })
                })
            }

            /* ******************** 图集模式相关的定义 结束 ********************/

            // 当拖拽的时候pan事件触发 拖拽事件
            at.on('pan', (e) => {
                if (e.nativeEvent.touches && e.nativeEvent.touches.length > 1) return
                // e包含位移/速度/方向等信息
                // 获取x,y偏移
                let deltaX = e.deltaX
                let deltaY = e.deltaY
                x += deltaX
                y -= deltaY
                let vx = x / canvas.width
                let vy = y / canvas.height
                px.value = vx.toString()
                py.value = vy.toString()
                if (currentNode) {
                    currentNode.x = [0, vx]
                    currentNode.y = [0, vy]
                }
            })

            at.on(['pinchin', 'pinchout'], debounce((e) => {
                // e包含位移/速度/方向等信息
                // 获取x,y偏移
                // scale *= e.scale
                if (e.scale > 1) scale += 0.1
                else if (e.scale < 1) scale -= 0.1
                scaleSlider.value = scale
                // 手动触发change事件
                scaleSlider.dispatchEvent(new CustomEvent('input'));
                e.preventDefault();
            }, 250))

            canvas.addEventListener('wheel', debounce(function (e) {
                let ratio = 0.05;
                // 缩小

                let scale = Number(scaleSlider.value)

                if (e.deltaY > 0) {
                    ratio = -0.05;
                }
                scale = scale + ratio;
                // 限制缩放倍数
                if (scale < 0.05) scale = 0.05
                scaleSlider.value = scale.toString()
                // 手动触发change事件
                if (currentNode) {
                    currentNode.scale = scaleSlider.value
                }
                document.getElementById('scale').value = scaleSlider.value;
                // e.preventDefault();
            }, 0))

            document.getElementById('closePreviewWindow').addEventListener(lib.config.touchscreen ? 'touchend' : 'click', function () {
                // 保存当前路径
                game.saveConfig(skinSwitch.configKey.lastPreviewPath, currentPath)
                // 删除自己当前节点即可
                let self = background
                // let self = document.getElementById('previewWindowDiv')
                let parent = self.parentElement
                // 停止当前的render
                isClosed = true
                thunderAllowTouch()
                setTimeout(() => {
                    // 延时删除节点, 等待最后一次渲染完成
                    parent.removeChild(self)
                }, 200)
            })

            function init() {

                if (!activeSkeleton) {
                    return
                }

                document.getElementById('scale').oninput = function (e) {
                    let v = e.srcElement.value
                    if (scaleSlider) {
                        scaleSlider.value = v
                        scale = Number(v)
                    }
                    if (currentNode) {
                        currentNode.scale = Number(v) || 0.5
                    }

                }
                document.getElementById('posX').oninput = function (e) {
                    let v = e.srcElement.value
                    if (currentNode) {
                        currentNode.y = [0, Number(v) || 0.65]
                    }
                }
                document.getElementById('posY').oninput = function (e) {
                    let v = e.srcElement.value
                    if (currentNode) {
                        currentNode.y = [0, Number(v) || 0.5]
                    }

                }

                document.getElementById('premultipliedAlpha').onchange = function (e) {
                    if (currentNode) {
                        currentNode.premultipliedAlpha = e.target.checked
                        persistPreviewNodeAlpha()
                    }
                }
                let unpackPremultipliedAlphaEl = document.getElementById('unpackPremultipliedAlpha')
                if (unpackPremultipliedAlphaEl) {
                    unpackPremultipliedAlphaEl.onchange = function (e) {
                        if (!currentNode) return
                        let ck = e.target.checked
                        currentNode.unpackPremultipliedAlpha = ck
                        if (ck) {
                            currentNode.premultipliedAlpha = true
                            document.getElementById('premultipliedAlpha').checked = true
                        }
                        if (lastSelFile) {
                            let rp = lastSelFile.getAttribute('path') || ''
                            let dot = rp.indexOf('.')
                            let x = dot >= 0 ? rp.substring(dot + 1).toLowerCase() : ''
                            if (x === 'skel' || x === 'json') {
                                let previewFilename = currentNode.name
                                if (!previewFilename) {
                                    let bn = rp.substring(0, rp.lastIndexOf('.'))
                                    previewFilename = currentPath ? currentPath + '/' + bn : bn
                                }
                                let ver = (currentNode._skinSwitchPreviewSpineVersion != null ? currentNode._skinSwitchPreviewSpineVersion : null) || '3.6'
                                let previewDy = animationManager.getAnimation(ver)
                                if (!previewDy.hasSpine(previewFilename)) {
                                    playSelectAsset(rp, { forceReloadSpine: true })
                                } else {
                                    previewDy.unpackPremultipliedAlpha = !!currentNode.unpackPremultipliedAlpha
                                    previewDy.update({ unpackPremultipliedAlpha: previewDy.unpackPremultipliedAlpha })
                                    if (typeof previewDy.refreshLoadedSpineUnpackTextures === 'function' && previewDy.refreshLoadedSpineUnpackTextures(previewFilename, !!currentNode.unpackPremultipliedAlpha)) {
                                        /* 已按新 Unpack 规则重传贴图 */
                                    } else {
                                        playSelectAsset(rp, { forceReloadSpine: true })
                                    }
                                }
                            }
                        }
                    }
                }

                document.getElementById('flipX').onchange = function (e) {
                    if (currentNode) {
                        currentNode.flipX = e.target.checked
                    }
                }
                document.getElementById('flipY').onchange = function (e) {
                    if (currentNode) {
                        currentNode.flipY = e.target.checked
                    }
                }


                scaleSlider.oninput = function () {
                    // let v= s1.value / 8;
                    if (currentNode) {
                        currentNode.scale = scaleSlider.value
                    }
                    document.getElementById('scale').value = scaleSlider.value;
                }

                let setupAnimationUI = () => {
                    // 初始化骨骼数据
                    if (!activeSkeleton) {
                        return
                    }
                    let animationList = document.getElementById('animationList')
                    animationList.options.length = 0

                    let skeleton = activeSkeleton
                    let state = skeleton.state;
                    let activeAnimation = state.tracks[0].animation.name;
                    for (let i = 0; i < skeleton.data.animations.length; i++) {
                        let name = skeleton.data.animations[i].name;
                        let option = document.createElement('option')
                        option.setAttribute('value', name)
                        option.text = name
                        if (name === activeAnimation) {
                            option.setAttribute('selected', 'selected')
                            document.getElementById('aniTime').innerText = Number(skeleton.data.animations[i].duration).toFixed(1)
                        }
                        animationList.options.add(option)
                    }

                    animationList.onchange = function () {
                        let skeleton = activeSkeleton
                        if (!skeleton) return
                        let state = skeleton.state
                        let animationName = animationList.options[animationList.selectedIndex].text
                        if (typeof state.clearTracks === 'function') state.clearTracks()
                        skeleton.setToSetupPose()
                        let entry = state.setAnimation(0, animationName, true)
                        if (entry) entry.mixDuration = 0;
                        if (self.spineApplyWorldTransform) self.spineApplyWorldTransform(skeleton, 0);
                        else skeleton.updateWorldTransform();
                        let ani = skeleton.data.findAnimation(animationName)
                        if (ani) document.getElementById('aniTime').innerText = Number(ani.duration).toFixed(1)
                    }
                }

                let setupSkinUI = function () {
                    if (!activeSkeleton) {
                        return
                    }

                    let skinList = document.getElementById('skinList')
                    skinList.options.length = 0

                    let skeleton = activeSkeleton
                    let skins = skeleton.data.skins

                    for (let i = 0; i < skins.length; i++) {
                        let name = skins[i].name;
                        let option = document.createElement('option')
                        option.setAttribute('value', name)
                        option.text = name
                        if (i === 0) {
                            option.setAttribute('selected', 'selected')
                            document.getElementById('aniTime').innerText = Number(skeleton.data.animations[i].duration).toFixed(1)
                        }
                        skinList.options.add(option)
                    }

                    skinList.onchange = function () {
                        let skeleton = activeSkeleton
                        let skinName = skinList.options[skinList.selectedIndex].text
                        try {
                            skeleton.setSkinByName(skinName);
                            skeleton.setSlotsToSetupPose();
                        } catch (e) {
                            console.warn('Failed to set skin:', skinName, e);
                            // 如果设置指定皮肤失败，尝试使用默认皮肤
                            if (skeleton.data.defaultSkin) {
                                try {
                                    skeleton.setSkin(skeleton.data.defaultSkin);
                                    skeleton.setSlotsToSetupPose();
                                } catch (e2) {
                                    console.warn('Failed to set default skin:', e2);
                                }
                            }
                        }
                    }
                }

                setupAnimationUI()
                setupSkinUI()

                // 初始化xy坐标
                x = 0.65 * canvas.width
                y = 0.5 * canvas.height
                scaleSlider.value = 0.5
                document.getElementById('scale').value = 0.5
                currentNode.premultipliedAlpha = document.getElementById('premultipliedAlpha').checked
                let unpackInit = document.getElementById('unpackPremultipliedAlpha')
                if (unpackInit) {
                    unpackInit.checked = !!currentNode.unpackPremultipliedAlpha
                }
                currentNode.flipX = document.getElementById('flipX').checked
                currentNode.flipY = document.getElementById('flipY').checked
            }
        },



        // todo: 通过点击角色身上的按钮,打开设置动皮的变身事件
        openEventBindWindow: function (player, isPrimary) {

            const eventBindWindow = ui.create.div('.eventBindWindow', document.body)
            const eventBindToolBox = ui.create.div('.eventBindToolBox', eventBindWindow)
            const toolItems = ui.create.div('.toolItems', eventBindToolBox)

            const triggerSelectOut = ui.create.div('.triggerSelectOut', toolItems)
            const transformBtn = ui.create.div('.transformBtn .eventBindButton .success', toolItems)
            const playEffectBtn = ui.create.div('.playEffectBtn .eventBindButton .success', toolItems)
            const previewBtn = ui.create.div('.previewBtn .eventBindButton .success', toolItems)
            const saveEffect = ui.create.div('.eventBindButton .success', toolItems)
            const exit = ui.create.div('.eventBindButton .success', toolItems)
            triggerSelectOut.innerHTML = `
                <select id="triggerSelect" class="triggerSelect"></select> 
            `
            const triggerSelect = document.getElementById('triggerSelect')
            transformBtn.innerText = '变换'
            playEffectBtn.innerText = '播放特效'
            previewBtn.innerText = '预览'
            saveEffect.innerText = '保存'
            exit.innerText = '退出'

            const transformContent = ui.create.div('.transformContent', eventBindWindow)
            const contentHeaders = ui.create.div('.contentHeaders', transformContent)  // 内容区域的选项区域
            const contentArea = ui.create.div('.contentArea', transformContent)  // 内容区域真正内容

            const transTemps = document.createElement('select')
            contentHeaders.appendChild(transTemps)
            const sameSkel = ui.create.div('.eventBindButton', contentHeaders)
            const diffSkel = ui.create.div('.eventBindButton', contentHeaders)
            const newTemp = ui.create.div('.eventBindButton', contentHeaders)


            sameSkel.innerText = '同骨骼'
            diffSkel.innerText = '不同骨骼'
            newTemp.innerText = '新建'

            // 初始化预览播放器, 共用十周年UI定义的播放器的canvas
            if (!skinSwitch.animationManager) {
                skinSwitch.animationManager = new AnimationManager(lib.assetURL + 'extension/十周年UI/assets/animation/', dcdAnim.canvas, 988888, { offscreen: false })
            }
            const am = skinSwitch.animationManager

            // 一些常量
            const dyskins = decadeUI.dynamicSkin
            const dyskinKeys = Object.keys(dyskins)

            // 一些初始化函数
            const initOptions = (selectDom, keyValueMap, func) => {
                selectDom.options.length = 0
                for (let k in keyValueMap) {
                    let text = keyValueMap[k]
                    let option = document.createElement('option')
                    option.setAttribute('value', k)
                    option.text = text
                    selectDom.options.add(option)
                }
                if (func) {
                    selectDom.onchange = function (e) {
                        func(this.options[this.selectedIndex].value, e)
                    }
                }

            }

            // 初始化同骨骼的内容
            const initSameSkelInfo = () => {
                contentArea.innerHTML = `
                    <div class="sameBox">
                        <div class="sameBoxItem">
                            <div class="label">标签</div>
                            <select id="sameActionSelect" class="sameActionSelect"></select> 
                        </div>
                        <div class="sameBoxItem">
                            <div class="label">皮肤</div>
                            <select id="sameSkinSelect" class="sameSkinSelect"></select> 
                        </div>
                        <div class="sameBoxItem">
                            <div class="label">血量</div>
                            <select id="sameHpSelect" class="sameHpSelect"></select> 
                            <input type="text">
                        </div>
                    </div>
                `
            }

            let transformTempKV = {
                变身1: '变身1',
                变身2: '变身2',
            }
            initOptions(transTemps, transformTempKV)
            // 初始化不同骨骼的内容
            const initDiffSkelInfo = () => {
                contentArea.innerHTML = `
                    <div class="adjustBox">
                        <div class="title">角色调整</div>
                        <div class="closeBtn">×</div>
                        <div class="btnGroup">
                            <div class="btnItem" id="daijiBtn">调整待机</div>
                            <div class="btnItem" id="beijingBtn">调整背景</div>
                            <div class="btnItem" id="qianjingBtn">调整前景</div>
                            <div class="btnItem" id="chukuangBtn">调整出框</div>
                            <div class="btnItem" id="chuchangBtn">调整出场</div>
                            <div class="btnItem" id="teshuBtn">调整特殊</div>
                            <div class="btnItem" id="hudongBtn">调整互动</div>
                            <div class="btnItem" id="zhishixianBtn">调整指示线</div>

                        </div>
                        <div class="bottomBtns">
                            <div class="btnItem" id="saveBtn">保存</div>
                            <div class="btnItem" id="cancelBtn">返回</div>
                        </div>
                    </div>
                `
                const daijiBtn = document.getElementById('daijiBtn')
                const beijingBtn = document.getElementById('beijingBtn')
                const qianjingBtn = document.getElementById('qianjingBtn')
                const chukuangBtn = document.getElementById('chukuangBtn')
                const chuchangBtn = document.getElementById('chuchangBtn')
                const teshuBtn = document.getElementById('teshuBtn')
                const zhishixianBtn = document.getElementById('zhishixianBtn')

                const saveBtn = document.getElementById('saveBtn')
                const cancelBtn = document.getElementById('cancelBtn')
                const closeBtn = document.querySelector('.closeBtn')

                // 当前选中的按钮
                let currentBtn = null

                // 按钮点击处理函数
                const handleBtnClick = (btn, mode) => {
                    if (currentBtn) {
                        currentBtn.classList.remove('btnSelect')
                    }
                    btn.classList.add('btnSelect')
                    currentBtn = btn
                    currentMode = mode  // 设置当前模式

                    // 显示调整界面
                    showAdjustBar()
                    showShizi(true)
                    initPosParams()

                    // 播放对应动画
                    if (mode === 'chuchang') {
                        skinSwitch.chukuangWorkerApi.chukuangAction(player, 'chuchang')
                    } else if (mode === 'chukuang') {
                        skinSwitch.chukuangWorkerApi.chukuangAction(player, 'GongJi')
                    } else if (mode === 'teshu') {
                        skinSwitch.chukuangWorkerApi.chukuangAction(player, 'TeShu')
                    } else if (mode === 'hudong') {
                        skinSwitch.chukuangWorkerApi.chukuangAction(player, 'HuDong')
                    } else if (mode === 'zhishixian') {
                        // 播放指示线动画，需要模拟攻击事件来触发指示线
                        playZhishixianAnimation()
                    } else {
                        selfLoopPlay(mode)
                    }
                }

                // 保存按钮
                saveBtn.addEventListener('click', () => {
                    // 保存当前调整
                    saveCurrentModeAdjustment()

                    // 只保存当前模式的调整参数
                    saveToFile(true) // 传入true表示显示保存消息

                    // 从临时调整中移除当前已保存的模式
                    if (tempAdjustments[currentMode]) {
                        delete tempAdjustments[currentMode]
                    }
                })

                // 取消按钮
                cancelBtn.addEventListener('click', () => {
                    // 隐藏调整界面
                    hide(editBox)
                })

                // 关闭按钮
                closeBtn.addEventListener('click', () => {
                    // 隐藏调整界面
                    hide(editBox)
                })

                // 指示线动画播放函数
                const playZhishixianAnimation = () => {
                    // 检查当前角色是否有指示线配置
                    let playerParams = player.dynamic.primary.player
                    if (!playerParams.zhishixian) {
                        return
                    }

                    // 模拟攻击事件来触发指示线
                    let targets = game.players.filter(p => p !== player && p.isAlive())
                    if (targets.length === 0) {
                        // 如果没有其他玩家，创建一个虚拟目标
                        targets = [{
                            getBoundingClientRect: () => ({
                                left: window.innerWidth * 0.7,
                                top: window.innerHeight * 0.5,
                                width: 100,
                                height: 150
                            }),
                            checkBoundsCache: () => { }
                        }]
                    }

                    // 构造指示线参数
                    let args = {
                        hand: null,
                        attack: {},
                        targets: [],
                        bodySize: {
                            bodyWidth: decadeUI.get.bodySize().width,
                            bodyHeight: decadeUI.get.bodySize().height
                        }
                    }

                    // 获取攻击方位置
                    if (player.checkBoundsCache) player.checkBoundsCache(true)
                    args.attack = player.getBoundingClientRect()

                    // 获取目标位置（选择第一个目标）
                    let target = targets[0]
                    if (target.checkBoundsCache) target.checkBoundsCache(true)
                    args.targets.push({
                        boundRect: target.getBoundingClientRect(),
                    })

                    // 如果是玩家，添加手牌区域
                    if (player === game.me && decadeUI.boundsCaches && decadeUI.boundsCaches.hand) {
                        let hand = decadeUI.boundsCaches.hand
                        hand.check()
                        let x1 = hand.x + hand.width / 2
                        let y1 = hand.y
                        args.hand = {
                            x1: x1,
                            y1: y1
                        }
                    }

                    // 播放指示线动画
                    skinSwitch.chukuangWorkerApi.chukuangAction(player, 'GongJi', {
                        attackArgs: args,
                        triggername: 'useCard'
                    })
                }

                // 添加按钮点击事件
                daijiBtn.addEventListener('click', () => handleBtnClick(daijiBtn, 'daiji'))
                beijingBtn.addEventListener('click', () => handleBtnClick(beijingBtn, 'beijing'))
                qianjingBtn.addEventListener('click', () => handleBtnClick(qianjingBtn, 'qianjing'))
                chukuangBtn.addEventListener('click', () => handleBtnClick(chukuangBtn, 'chukuang'))
                chuchangBtn.addEventListener('click', () => handleBtnClick(chuchangBtn, 'chuchang'))
                teshuBtn.addEventListener('click', () => handleBtnClick(teshuBtn, 'teshu'))
                zhishixianBtn.addEventListener('click', () => {
                    // 检查当前角色是否有指示线配置
                    let playerParams = player.dynamic.primary.player
                    if (!playerParams.zhishixian) {
                        alert('当前皮肤没有设置指示线动画配置')
                        return
                    }
                    handleBtnClick(zhishixianBtn, 'zhishixian')
                })



                const lettersList = ['ABCDEFGHIJKLM', 'NOPQRSTUVWXYZ']
                const defaultTransformDir = 'extension/皮肤切换/effects/transform'

                searchPlayerIdBtn.listen(function (e) {
                    let inputVal = this.previousElementSibling.value
                    let wujiangIds = searchWuJiangId(inputVal)
                    initWuJiangIds(wujiangIds)
                    refreshSelectLetter(null)
                })

                for (let i = 0; i < 2; i++) {
                    const letterChild = letterDiv.children[i]
                    const letters = lettersList[i]

                    for (let t of letters) {
                        let span = document.createElement('span')
                        span.innerText = t
                        span.addEventListener(lib.config.touchscreen ? 'touchend' : 'click', function () {
                            let letter = this.innerText
                            let wujiangIds = searchWuJiangId(letter, true)
                            refreshSelectLetter(letter)
                            // 改变下面的武将id列表
                            initWuJiangIds(wujiangIds)

                        })
                        letterChild.appendChild(span)
                    }
                }

                const refreshSelectLetter = (selected) => {
                    for (let i = 0; i < 2; i++) {
                        const letterChild = letterDiv.children[i]
                        for (let span of letterChild.children) {
                            if (span.innerText === selected) {
                                span.classList.add('firstActive')
                            } else {
                                span.classList.remove('firstActive')
                            }
                        }
                    }
                }

                const initWuJiangIds = (wujiangIds) => {
                    for (let i = wujiangIdList.children.length - 1; i >= 0; i--) {
                        wujiangIdList.children[i].remove()
                    }
                    for (let i = 0; i < wujiangIds.length; i++) {
                        let idDiv = ui.create.div('.wujiangIdItem', wujiangIdList);
                        idDiv.style.cursor = 'pointer';
                        idDiv.innerText = wujiangIds[i];
                        idDiv.listen(function () {
                            // 更新当前武将所对应的皮肤.
                            let wujiangId = this.innerText
                            const skins = decadeUI.dynamicSkin[wujiangId]
                            let keys = Object.keys(skins)
                            let keysMap = {}
                            for (let k of keys) {
                                keysMap[k] = k
                            }
                            initOptions(wujiangSkinSelect, keysMap)
                        });
                    }
                }

                // 获取所有的切换骨骼特效
                const initTransformEffect = () => {
                    let allEffects = {}
                    for (let k in skinSwitch.effects.transformEffects) {
                        allEffects[k] = Object.assign({}, skinSwitch.effects.transformEffects[k])
                    }
                    pfqhUtils.getFoldsFiles(defaultTransformDir, function (file, path) {
                        let suffixes = ['.json', '.skel']
                        for (let suf of suffixes) {
                            if (file.endsWith(suf)) {
                                return true
                            }
                        }
                        return false
                    }, function (folds, files) {
                        // 获取所有的特效
                        for (let f of files) {
                            let name = f.substring(0, f.lastIndexOf("."))
                            let ext = f.substring(f.lastIndexOf(".") + 1)
                            if (name in allEffects) {

                            } else {
                                allEffects[name] = {
                                    scale: 0.5,  // 默认的参数值
                                    speed: 1,
                                    delay: 0.3,
                                    json: ext === 'json'
                                }
                            }
                        }
                        let optionKeys = {}
                        for (let k in allEffects) {
                            optionKeys[k] = k
                        }
                        initOptions(transEffectSelect, optionKeys, function (key, e) {
                            let eff = allEffects[key]
                            if (eff) {
                                transItemScale.value = eff.scale || 0.5
                                transItemDelay.value = eff.delay || 0.3
                                transItemSpeed.value = eff.speed || 1
                                transItemAngle.value = eff.angle || 0
                                if (eff.x) {
                                    transItemX.value = eff.x[1]
                                } else {
                                    transItemX.value = null
                                }
                                if (eff.y) {
                                    transItemY.value = eff.y[1]
                                } else {
                                    transItemY.value = null
                                }
                            }
                        })

                    })
                }

                setTimeout(() => {
                    initTransformEffect()
                }, 2000)

            }

            const searchWuJiangId = (str, isFirstLetter = false) => {
                if (isFirstLetter) {
                    return dyskinKeys.filter(v => {
                        return v[0].toLowerCase() === str.toLowerCase()
                    })
                }
                return dyskinKeys.filter(v => {
                    return v.toLowerCase().indexOf(str.toLowerCase()) !== -1
                })
            }

            // const playEffectContent = ui.create.div('.playEffectContent', eventBindWindow)

            initOptions(triggerSelect, triggerConstant)

            // initSameSkelInfo()
            initDiffSkelInfo()

        },


        // 覆盖menu菜单
        overrideExtL2dMenuItem: function () {
            // 修改配置, 只获取前10个
            let count = 10
            if (window.pfqhLive2dSettings) {
                let newItem = {};
                for (let k in pfqhLive2dSettings.models) {
                    if (!count) break
                    count--
                    newItem[k] = pfqhLive2dSettings.models[k].name || k
                }

            }
        },
        // 封装长按事件
        continuousClick: function (dom, func) {
            const downEvent = lib.config.touchscreen ? 'touchstart' : 'mousedown'
            const upEvent = lib.config.touchscreen ? 'touchend' : 'mouseup'
            const cancelEvent = lib.config.touchscreen ? 'touchcancel' : 'mouseleave'

            let downFunc = function (e) {
                // 改变骨骼的位置
                //获取鼠标按下时的时间
                let t = setInterval((e) => { func(e, ++downFunc._times) }, 120)
                clearInterval(downFunc.timer)
                downFunc.timer = t
                downFunc._times = 0  // 表示触发了多少次
                func(e, ++downFunc._times)  // 立马执行一次
            }
            let holdUp = function () {
                clearInterval(downFunc.timer);
                downFunc._times = 0
            }

            dom.addEventListener(downEvent, downFunc)
            dom.addEventListener(upEvent, holdUp)
            dom.addEventListener(cancelEvent, holdUp)
        }
    };
}

