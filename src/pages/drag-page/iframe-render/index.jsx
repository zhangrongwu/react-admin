import React, {useCallback, useRef, useEffect, useState} from 'react';
import ReactDOM from 'react-dom';
import {ConfigProvider} from 'antd';
import zhCN from 'antd/lib/locale-provider/zh_CN';
import config from 'src/commons/config-hoc';
import NodeRender from './node-render/NodeRender';
import {loopPageConfig, scrollElement} from 'src/pages/drag-page/util';
import Scale from './scale';
import DragOver from './drag-over';
import DragAction from './drag-action';
import EditableAction from './editable-action';
import NodePath from './node-path';
import './style.less';
import {getComponentConfig} from 'src/pages/drag-page/component-config';

// 构建iframe内容
function getIframeSrcDoc() {
    const headHtml = document.head.innerHTML;
    return `
        <!DOCTYPE html>
        <html lang="en">
            <header>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=0.5, maximum-scale=2.0, user-scalable=yes" />
                ${headHtml}
            </header>
            <body style="scroll-behavior: smooth;overflow: auto">
                <div id="dnd-container" style="display: flex; flex-direction: column; min-height: 100vh"></div>
                <div id="drop-guide-line" style="display: none">
                    <span>前</span>
                </div>
                <div id="drop-guide-bg" style="display: none;"></div>
            </body>
        </html>
    `;
}


export default config({
    side: false,
    connect: state => {
        return {
            pageConfig: state.dragPage.pageConfig,
            activeToolKey: state.dragPage.activeToolKey,
            selectedNodeId: state.dragPage.selectedNodeId,
            nodeSelectType: state.dragPage.nodeSelectType,
            activeSideKey: state.dragPage.activeSideKey,
            draggingNode: state.dragPage.draggingNode,
            canvasWidth: state.dragPage.canvasWidth,
            canvasHeight: state.dragPage.canvasHeight,
            rightSideExpended: state.dragPage.rightSideExpended,
            showSide: state.dragPage.showSide,
            rightSideWidth: state.dragPage.rightSideWidth,
            schemaEditorWidth: state.dragPage.schemaEditorWidth,
            componentTreeWidth: state.dragPage.componentTreeWidth,
            contentEditable: state.dragPage.contentEditable,
        };
    },
})(function IframeRender(props) {
    const {
        pageConfig,
        activeToolKey,
        selectedNodeId,
        nodeSelectType,
        activeSideKey,
        draggingNode,
        canvasWidth,
        canvasHeight,
        rightSideExpended,
        showSide,
        rightSideWidth,
        schemaEditorWidth,
        componentTreeWidth,
        contentEditable,
        action: {dragPage: dragPageAction},
    } = props;

    const isPreview = activeToolKey === 'preview';

    const containerRef = useRef(null);
    const iframeRef = useRef(null);
    const iframeRootRef = useRef(null);
    const [scaleElement, setScaleElement] = useState(null);
    const [containerStyle, setContainerStyle] = useState({});
    const [iframeSrcDoc, setIframeSrcDoc] = useState('<html lang="cn"/>');
    const [state, setState] = useState({});

    // iframe 加载完成后一些初始化工作
    const handleIframeLoad = useCallback(() => {
        const iframeDocument = iframeRef.current.contentDocument;

        iframeRootRef.current = iframeDocument.getElementById('dnd-container');

        setScaleElement(iframeRootRef.current);

        dragPageAction.setIFrameDocument(iframeDocument);

    }, [iframeRef.current]);

    useEffect(() => {
        const iframeSrcDoc = getIframeSrcDoc();

        setIframeSrcDoc(iframeSrcDoc);

    }, []);

    useEffect(() => {
        if (!pageConfig) return;

        // 设置所有已存在的
        loopPageConfig(pageConfig, node => {
            const {state: nodeState} = node;
            if (nodeState) {
                const {
                    field,
                    fieldValue,
                    funcField,
                    funcValue,
                } = nodeState;
                if (!(field in state)) {
                    state[field] = fieldValue;
                    // eslint-disable-next-line
                    state[funcField] = eval(funcValue);
                }
            }
        });

        // 设置新的
        loopPageConfig(pageConfig, node => {
            const nodeConfig = getComponentConfig(node.componentName);

            const {state: setNodeState} = nodeConfig;
            const {state: nodeState} = node;
            if (!nodeState && setNodeState) {
                setNodeState({state, node, dragPageAction});

                const {
                    field,
                    fieldValue,
                    funcField,
                    funcValue,
                } = node.state;

                state[field] = fieldValue;
                // eslint-disable-next-line
                state[funcField] = eval(funcValue);
            }
        });

        setState(state);
    }, [pageConfig]);


    const draggableNodeProps = {
        state,
        config: pageConfig,
        pageConfig,
        selectedNodeId,
        nodeSelectType,
        draggingNode,
        activeSideKey,
        dragPageAction,
        isPreview,
        contentEditable,
        iframeDocument: iframeRef.current?.contentDocument,
    };
    useEffect(() => {
        const iframeRootEle = iframeRootRef.current;

        if (!iframeRootEle) return;

        ReactDOM.render(
            <ConfigProvider locale={zhCN} getPopupContainer={() => iframeRootRef.current}>
                {isPreview || !contentEditable ? null : <EditableAction {...draggableNodeProps}/>}
                <DragAction {...draggableNodeProps}>
                    <NodeRender {...draggableNodeProps}/>
                </DragAction>
            </ConfigProvider>,
            iframeRootEle,
        );
    }, [
        ...Object.values(draggableNodeProps),
        iframeRootRef.current,
    ]);

    // 选中组件之后，调整左侧组件树滚动
    useEffect(() => {
        const containerEle = iframeRef.current.contentDocument.body;

        if (!containerEle) return;

        // 等待树展开
        setTimeout(() => {
            const element = containerEle.querySelector(`[data-component-id="${selectedNodeId}"]`);

            scrollElement(containerEle, element);
        }, 200);

    }, [selectedNodeId, iframeRef.current]);

    // 缩放时设置设计页面居中
    useEffect(() => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();

        const style = {};
        const {width, height} = rect;

        const iRect = iframeRef.current.getBoundingClientRect();
        const {width: iWidth, height: iHeight} = iRect;

        if (iWidth < width) {
            style.justifyContent = 'center';
        }
        if (iHeight < height) {
            style.alignItems = 'center';
        }

        setContainerStyle(style);

    }, [
        // 所有可能影响到中间部分尺寸变化的操作，都要添加！！！
        rightSideExpended,
        showSide,
        rightSideWidth,
        schemaEditorWidth,
        componentTreeWidth,
        canvasWidth,
        canvasHeight,
        iframeRef.current,
    ]);

    return (
        <div styleName="root">
            <main>
                <div
                    styleName="container"
                    ref={containerRef}
                    style={containerStyle}
                >
                    <iframe
                        styleName="dndIframe"
                        id="dnd-iframe"
                        title="页面设计"
                        ref={iframeRef}
                        srcDoc={iframeSrcDoc}
                        onLoad={() => handleIframeLoad()}
                        style={{
                            width: canvasWidth,
                            height: canvasHeight,
                        }}
                    />
                    <div styleName="scale">
                        <Scale element={scaleElement}/>
                    </div>
                </div>
                <footer>
                    <NodePath/>
                </footer>
            </main>
            <DragOver frameDocument={iframeRef.current?.contentDocument}/>
        </div>
    );
});
