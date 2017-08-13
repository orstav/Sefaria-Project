var $              = require('jquery'),
    React          = require('react'),
    ReactDOM       = require('react-dom'),
    Sefaria        = require('./sefaria/sefaria'),
    extend         = require('extend'),
    PropTypes      = require('prop-types'),
    DiffMatchPatch = require('diff-match-patch');
    import Component from 'react-class';  //auto-bind this to all event-listeners. see https://www.npmjs.com/package/react-class

function changePath(newPath) {
  const newUrl = window.location.origin + newPath;
  window.location.assign(newUrl);
}

class DiffStore {
  constructor (rawText) {
    this.rawText = rawText;
    this.FilterText();
    this.diffList = null;
  }

  FilterText () {
    var segList = this.rawText.split(/(<[^>]+>)/),
    mapping = [],
    filteredTextList = [],
    skipCount = 0;

    for (var [i, seg] of segList.entries()) {

      if (i%2 === 0) { // The odd elements are the text
        // The map contains the number of skipped characters for each character of  the filtered text
        Array.prototype.push.apply(mapping, Array(seg.length).fill(skipCount));
        filteredTextList.push(seg);
      } else {
        if (seg.search(/^</) === -1 | seg.search(/>$/) === -1) {
          alert("Even item in filter not HTML");
          debugger;
        }
        skipCount += seg.length;
      }
    }
    this.filteredText = filteredTextList.join("");
    this.mapping = mapping;
  }

  ValidateDiff(proposedDiff) {
    /*
    * Compare each potential diff against mapping to ensure nothing was filtered
    * out. A diff is okay if the number of skipped characters in constant along the
    * length of the proposed change. This can be easily checked by asserting that
    * the value in the mapping that represents the first character position of the
    * change is identical to the value at the last position.
    * The special case of a "zero length diff" can be checked by validating that
    the mapping position before and after are identical.
    */
    var charCount = 0,
    validatedDiff = [];
    for (var element of proposedDiff) {
      if (element[1] === undefined) {debugger;}

      var length = element[1].length;
      if (element[0] === 0) {validatedDiff.push([0, element[1]]);}

      else if (element[1].length > 0) {

        if (this.mapping[charCount] === this.mapping[charCount+length-1]) {
          validatedDiff.push([1, element[1]]);
        } else {validatedDiff.push([2, element[1]]);}

      } else {

        if (this.mapping[charCount] === this.mapping[charCount+1]) {
          validatedDiff.push([1, element[1]]);
        } else {validatedDiff.push([2, element[1]])}
      }
        charCount += length;
      }
    return validatedDiff;
    }
  }

class PageLoader extends Component {
  constructor(props) {
    super(props);
    this.state = {
      secRef: this.props.secRef,
          v1: this.props.v1,
          v2: this.props.v2,
        lang: this.props.lang,
    };
  //this.handleSubmit = this.handleSubmit.bind(this);
  }

formSubmit(nextState) {
  this.setState(nextState);
  }

componentDidUpdate() {
  if (this.props.secRef != this.state.secRef ||
      this.props.lang != this.state.lang ||
      this.props.v1 != this.state.v1 ||
      this.props.v2 != this.state.v2) {

    var newPathname =
    ['/compare', this.state.secRef, this.state.lang,
    this.state.v1, this.state.v2].join('/');
    newPathname = newPathname.split('//').join('/'); //In case some variable is None
    newPathname = newPathname.split(' ').join('_');
    //window.location.pathname = newPathname;
    changePath(newPathname);
  }
}

render() {
    return (
      <div>
      <DataForm
      secRef={this.props.secRef ? this.props.secRef : ""}
      lang={this.props.lang ? this.props.lang : "he"}
      v1={this.props.v1 ? this.props.v1 : ""}
      v2={this.props.v2 ? this.props.v2 : ""}
      formSubmit={this.formSubmit}/>
      {(this.props.secRef != null & this.props.v1 != null & this.props.v2 != null & this.props.lang != null)
      ? <DiffTable
          secRef={this.props.secRef}
          v1={this.props.v1}
          v2={this.props.v2}
          lang={this.props.lang}/> : null}
      </div>
    );
  }
}

class DataForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      secRef: this.props.secRef,
      lang: this.props.lang,
      v1: this.props.v1,
      v2: this.props.v2,
      possibleVersions: null
    };
  }

  handleInputChange(event) {
    const target = event.target;
    const value = target.value;
    const name = target.name;

    this.setState({
      [name]: value
    });
  }

  handleSubmit(event) {
    this.props.formSubmit({
      secRef: this.state.secRef,
      lang: this.state.lang,
      v1: this.state.v1,
      v2: this.state.v2
    })

    event.preventDefault();
    return (false);
  }

  loadPossibleVersions(versions) {
    console.log(typeof(versions));
    let lang = this.state.lang;
    let possibleVersions = versions.reduce(function(vList, version) {
      if (version.language === lang) {
        vList.push(version.versionTitle);
      }
      return vList;
    }, []);
    this.setState({possibleVersions: possibleVersions});
  }

  componentWillMount() {
    if (Sefaria.isRef(this.state.secRef)) {
      Sefaria.versions(this.state.secRef, this.loadPossibleVersions);
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    let versionChanged = function(nextVersions, prevVersions) {
      if ((nextVersions === null & prevVersions != null) ||
          (nextVersions != null & prevVersions === null)) {
        return true;
      } else if (nextVersions === null && prevVersions === null) {
        return false;
      } else if (nextVersions.length != prevVersions.length) {
        return true;
      } else {
        for (let i=0; i<nextVersions.length; i++) {
          if (nextVersions[i] != prevVersions[i]) {
            return true;
          }
        }
        return false;
      }
      /*if (thisState.possibleVersions!=null && nextState.possibleVersions===null) {
        return true;
      } else if (thisState.possibleVersions === null && nextState.possibleVersions === null) {
        return false;
      } else if (thisState.possibleVersions.length != nextState.possibleVersions.length) {
        return true;
      } else if (thisState.possibleVersions[0] != nextState.possibleVersions[0]) {
        return true;
      } else {
        return false;
      }*/
    }
    return(
      versionChanged(nextState.possibleVersions, this.state.possibleVersions) ||
      (this.state.secRef != nextState.secRef) ||
      (this.state.lang != nextState.lang) ||
      (this.state.v1 != nextState.v1) ||
      (this.state.v2 != nextState.v2)
    );
  }

  componentDidUpdate(prevProps, prevState) {
    if (Sefaria.isRef(prevState.secRef) && prevState.lang) {
      Sefaria.versions(prevState.secRef, this.loadPossibleVersions)
    } else {
      this.setState({possibleVersions: null});
    }
    /*if (this.state.possibleVersions != null) {
      if (this.state.v1 === null) {
        this.setState({v1: this.State.possibleVersions[0]});
      }
      if (this.state.v2 === null) {
        this.setState({v2: this.State.possibleVersions[0]});
      }
    }*/
  }

  render() {
    let versionOptions =
    this.state.possibleVersions ? this.state.possibleVersions.map(function(ver) {
      return <option value={ver} key={ver}>{ver}</option>;
    }) : null;

    return (
      <form onSubmit={this.handleSubmit}>
        <label>
          Ref:
          <input
            name="secRef"
            type="text"
            value={this.state.secRef}
            onChange={this.handleInputChange}
            style={{width: "300px"}}/>
        </label>
        <label>
          Language:
          <select
            name="lang"
            value={this.state.lang}
            onChange={this.handleInputChange}>
            <option value="he">Hebrew</option>
            <option value="en">English</option>
          </select>
        </label>
        {versionOptions ?
        [<label key="version1">
          Version 1:
          <select
            name="v1"
            value={this.state.v1}
            onChange={this.handleInputChange}>
            <option value="">Select a Version</option>
            {versionOptions}
          </select>
        </label>,
        <label key="version2">
          Version 2:
          <select
            name="v2"
            value={this.state.v2}
            onChange={this.handleInputChange}>
            <option value="">Select a Version</option>
            {versionOptions}
          </select>
        </label>] : null}
        <br />
        <input type="submit" value="Load Diff" />
      </form>
    );

  }
}

class DiffTable extends Component {
  constructor(props) {
    super(props);
    this.state = {
      v1Length: null, v2Length: null
    };
  }

  LoadSection(props) {
    Sefaria.text(props.secRef,
      {language: props.lang, version: props.v1},
      data => this.setState({
        v1Length: props.lang === 'he' ? data['he'].length : data.text.length
      }));

    Sefaria.text(props.secRef,
      {language: props.lang, version: props.v2},
      data => this.setState({
        v2Length: props.lang === 'he' ? data['he'].length : data.text.length
      }));
  }

  componentWillMount() {
    this.LoadSection(this.props);
  }

  componentWillReceiveProps(nextProps) {
    this.LoadSection(nextProps);
  }

  render () {
    if (this.state.v1Length === null || this.state.v2Length === null) {
      return (<div>Loading Text...</div>);
    } else {
      var numSegments = Math.max(this.state.v1Length, this.state.v2Length),
          rows = [];

      for (var i=1; i<=numSegments; i++) {
        rows.push(<DiffRow
          segRef={this.props.secRef + ":" + i.toString()}
          v1    ={this.props.v1}
          v2    ={this.props.v2}
          lang  ={this.props.lang}
          key   ={i.toString()}/>);
      }
    }

      return (
        <table>
          <thead>
            <tr>
              <td>{this.props.secRef}</td>
              <td>{this.props.v1}</td>
              <td>{this.props.v2}</td>
            </tr>
          </thead>
          <tbody>
            {rows}
          </tbody>
        </table>
      );
  }
}

class DiffRow extends Component {
  constructor(props) {
    super(props);
    this.state = {
      v1: null,
      v2: null,
      requiresUpdate: true
    }
  }

  generateDiff (seg1, seg2) {
    var diff1 = [],
        diff2 = [],
        Differ = new DiffMatchPatch(),
        offset = 0,
        mergeDiff = Differ.diff_main(seg1.filteredText, seg2.filteredText);
    for (var element of mergeDiff) {
      if (element[0] === -1) {
        diff1.push([1, element[1]]);
        offset -= 1;
      }
      else if (element[0] === 1) {
        diff2.push([1, element[1]]);
        offset += 1;
      }
      else if (element[0] === 0) {
        if (offset < 0) {
          diff2.push([1, '']);
          offset = 0;
        }
        else if (offset > 0) {
          diff1.push([1, '']);
          offset = 0;
        }
        diff1.push(element);
        diff2.push(element);
      }
    }
    if (offset < 0) {diff2.push([1, '']);}
    else if (offset > 0) {diff1.push([1, '']);}

    diff1 = seg1.ValidateDiff(diff1);
    diff2 = seg2.ValidateDiff(diff2);

    if (diff1.length != diff2.length) {
      debugger;
      console.log('diffs do not match in length');
    }
    for (var i=0; i<diff1.length; i++) {
      if (diff1[i][0] === 0 & diff2[i][0] === 0) {continue}

      else if (diff1[i][0] === 1 & diff2[i][0] === 1) {
        // This is a legal change - add the proposed change to the diff piece
        diff1[i].push(diff2[i][1]);
        diff2[i].push(diff1[i][1]);
      }

      // This is a case where one is illegal and another is okay -> set both to be illegal
      else if (diff1[i][0] >= 1 & diff2[i][0] >= 1) {
        diff1[i][0] = 2;
        diff2[i][0] = 2;
      }
      else {alert("Bad match")}
    }
    seg1.diffList = diff1;
    seg2.diffList = diff2;
    this.setState({v1: seg1, v2: seg2, requiresUpdate: false})
  }

  LoadText (text, version) {
    let myText = this.props.lang === 'he' ? text['he'] : text.text;
    if (version === 'v1') {
      this.setState({'v1': new DiffStore(myText)});
    } else {
      this.setState({'v2': new DiffStore(myText)});
    }
  }
  componentDidMount() {
    console.log('run componentDidMount');
    if (this.state.v1 != null & this.state.v2 != null) {
      this.generateDiff(this.state.v1, this.state.v2);
    }
  }

  componentDidUpdate() {
    // This may be necessary once we start pushing to server, but should remain
    // inactive for now.
    console.log('run componentDidUpdate');
    if (this.state.requiresUpdate & (this.state.v1 != null & this.state.v2 != null)) {
      this.generateDiff(this.state.v1, this.state.v2);
    }
  }

  LoadV1 (text) {this.LoadText(text, 'v1');}
  LoadV2 (text) {this.LoadText(text, 'v2');}

  componentWillMount () {
    var settings = {'version': this.props.v1, 'language': this.props.lang};
    Sefaria.text(this.props.segRef, settings, this.LoadV1);
    settings.version = this.props.v2;
    Sefaria.text(this.props.segRef, settings, this.LoadV2);
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.segRef != nextProps.segRef) {
      var settings = {'version': this.props.v1, 'language': this.props.lang};
      Sefaria.text(this.props.segRef, settings, this.loadV1);
      settings.version = this.props.v2;
      Sefaria.text(this.props.segRef, settings, this.loadV2);
    }
  }

  fullyLoaded() {
    if (this.state.v1 === null || this.state.v2 === null) {
      return false
    }
    else if (this.state.v1.diffList === null || this.state.v2.diffList === null) {
      return false
    }
    else {
      return true
    }
  }

  render() {
    if (!this.fullyLoaded()) {
      return <tr><td>{"Loading..."}</td></tr>
    }
    var cell1 = <DiffCell diff={this.state.v1} vtitle={this.props.v1} lang={this.props.lang}/>,
        cell2 = <DiffCell diff={this.state.v2} vtitle={this.props.v2} lang={this.props.lang}/>;

    return (
        <tr><td>{this.props.segRef}</td>{cell1}{cell2}</tr>
    );
  }
}

class DiffCell extends Component {

  acceptDiff(diffIndex) {
  /*
  *  Accept a change and make it to the rawText.
  *  diffIndex: An integer which indicates which element in the difflist to
  *  accept for the change.
  */
    console.log(this.props.diff.rawText);
    var diffList = this.props.diff.diffList; // Easier to access
    // begin by calculating the character position of the desired change in the filtered text
    var filteredPosition = 0;
    for (var i=0; i<diffIndex; i++) {
      filteredPosition += diffList[i][1].length;
    }
    // Our map tells you for each character in the filtered text how many characters
    // need to be added to get the equivalent position in the rawText. A legal
    // change demands no change of added characters along a single proposed diff.
    var rawPosition = filteredPosition + this.props.diff.mapping[filteredPosition],
        diffLength  = diffList[diffIndex][1].length;

    return (
      this.props.diff.rawText.slice(0, rawPosition) +
      diffList[diffIndex][2] +
      this.props.diff.rawText.slice(rawPosition + diffLength)
    );
  }

  render() {
    if (this.props.diff.diffList === null) {
      return (<td>{"Loading..."}</td>);
    }
    var spans = [];
    var diffList = this.props.diff.diffList;

    for (var i = 0; i < diffList.length; i++) {
      if (diffList[i][0] === 0) {
        spans.push(<span key={i.toString()}>{diffList[i][1]}</span>);
      }

      else if (diffList[i][0] === 1) {
      spans.push(<DiffElement
        text       = {diffList[i][1]}
        toText     = {diffList[i][2]}
        key        = {i.toString()}
        diffIndex  = {i}
        acceptDiff = {this.acceptDiff}
        />);
      }

      else {spans.push(<span className="del" key={i.toString()}>{diffList[i][1]}</span>);}

    }
    return (
          <td className={this.props.lang}>{spans}</td>
      );
    }
}

class DiffElement extends Component {
  constructor(props) {
    super(props)
    this.state = {mouseover: false};
  }
  onMouseOver() {
  //  console.log("MouseOver!");
    this.setState({mouseover: true});
  }
  onMouseOut() {
  //  console.log("MouseOut!");
    this.setState({mouseover: false});
  }
  onClick() {
    console.log(this.props.acceptDiff(this.props.diffIndex));
  }
  render() {
    return (
      <span onMouseOver={this.onMouseOver}
      onMouseOut={this.onMouseOut}
      onClick={this.onClick}
      className="ins">
      {this.props.text}
      {this.state.mouseover ? <span className="change">Change<br/> {this.props.text}<br/> to<br/>
      {this.props.toText}</span> : null}
      </span>);
  }
}
ReactDOM.render(<PageLoader secRef={JSON_PROPS.secRef}
                v1={JSON_PROPS.v1}
                v2={JSON_PROPS.v2}
                lang={JSON_PROPS.lang}/>,
                  document.getElementById('DiffTable'));
